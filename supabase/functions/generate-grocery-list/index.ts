import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";
import { checkRateLimit, getClientIp, createRateLimitResponse, RATE_LIMITS } from '../_shared/rateLimiting.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP
    const clientIp = getClientIp(req);
    
    const { eventId, guestCount } = await req.json();

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: 'Event ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limit check (authenticated endpoint, use user ID if available)
    const authHeader = req.headers.get('Authorization');
    let identifier = clientIp;
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (user) {
        identifier = user.id;
      }
    }

    const rateLimitConfig = RATE_LIMITS.GENERATE_GROCERY;
    const rateLimitResult = await checkRateLimit(
      supabase,
      identifier,
      'generate-grocery-list',
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMinutes
    );

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Initialize client with auth header
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader! },
        },
      }
    );

    // Get event items
    const { data: items, error: itemsError } = await supabaseClient
      .from('event_items')
      .select('*')
      .eq('event_id', eventId);

    if (itemsError) throw itemsError;

    // Get event details for guest count
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('name, max_attendees')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    const actualGuestCount = guestCount || event.max_attendees || 10;

    // Use AI to generate detailed grocery list
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const itemsList = items.map(item => {
      let itemDesc = `${item.name} (Goal: ${item.goal_quantity || 1} unit${item.goal_quantity > 1 ? 's' : ''})`;
      
      // serves_per_unit now represents total people to feed
      if (item.serves_per_unit) {
        itemDesc += ` - Needs to feed ${item.serves_per_unit} people`;
      }
      
      if (item.notes) {
        itemDesc += ` - ${item.notes}`;
      }
      
      return itemDesc;
    }).join('\n');

    const aiPrompt = `You are a culinary expert and meal planner. Generate a detailed grocery shopping list for the following event items for ${actualGuestCount} guests.

Event Items:
${itemsList}

IMPORTANT: Some items include "Needs to feed X people" information. Use this to calculate accurate ingredient quantities.
For example, if an item says "Needs to feed 24 people" and the goal is 3 units, plan ingredients for 24 servings divided across 3 units.

For each item, provide:
1. Ingredient name
2. Quantity needed (adjusted based on people to feed and ${actualGuestCount} guests)
3. Unit of measurement
4. Category (Produce, Dairy, Meat/Protein, Pantry, Bakery, Frozen, etc.)

Return ONLY a JSON array in this exact format with no additional text:
[
  {
    "name": "ingredient name",
    "quantity": numeric_value,
    "unit": "unit (cups, lbs, oz, etc.)",
    "category": "category name",
    "forItem": "which event item this is for"
  }
]

Be practical and realistic with quantities based on the people to feed. Group similar ingredients together.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a helpful meal planning assistant. Always respond with valid JSON only.' },
          { role: 'user', content: aiPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', aiResponse.status, await aiResponse.text());
      throw new Error('Failed to generate grocery list with AI');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content || '[]';
    
    // Extract JSON from response
    let groceryItems;
    try {
      // Try to parse directly
      groceryItems = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        groceryItems = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI response');
      }
    }

    // Create or update grocery list
    const { data: existingList } = await supabaseClient
      .from('grocery_lists')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle();

    const listData = {
      event_id: eventId,
      items: groceryItems,
      guest_count: actualGuestCount,
      serving_multiplier: 1.0,
      name: `${event.name} - Grocery List`,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existingList) {
      const { data, error } = await supabaseClient
        .from('grocery_lists')
        .update(listData)
        .eq('id', existingList.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabaseClient
        .from('grocery_lists')
        .insert(listData)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    console.log('Grocery list generated successfully:', result.id);

    return new Response(
      JSON.stringify({ success: true, groceryList: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating grocery list:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

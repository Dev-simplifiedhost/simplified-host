import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { checkRateLimit, getClientIp, isIpBlocked, createRateLimitResponse, RATE_LIMITS } from '../_shared/rateLimiting.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for rate limiting
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get client IP
    const clientIp = getClientIp(req);
    
    // Check if IP is blocked
    const blocked = await isIpBlocked(supabase, clientIp);
    if (blocked) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Rate limit check - 1 per day for free users (enforced also on frontend)
    const rateLimitConfig = RATE_LIMITS.GENERATE_PLAN;
    const rateLimitResult = await checkRateLimit(
      supabase,
      clientIp,
      'generate-event-plan',
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMinutes
    );

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { eventType, eventDate, duration, guestRange, hostingStyle, vibes, notes, existingItems, existingTasks } = await req.json();
    console.log('Generating event plan for:', { eventType, eventDate, duration, guestRange, hostingStyle, vibes, notes });
    
    // Determine if this is enhance mode
    const isEnhanceMode = (existingItems && existingItems.length > 0) || (existingTasks && existingTasks.length > 0);
    console.log('Enhance mode:', isEnhanceMode, 'Existing items:', existingItems?.length || 0, 'Existing tasks:', existingTasks?.length || 0);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build the structured prompt
    let systemPrompt = `You are an expert event planner. Generate a complete, structured event plan based on the user's inputs.

CRITICAL RULES:
- No long paragraphs. Use short, actionable bullet points.
- Do not repeat the user's inputs back to them.
- No filler language or conditional phrases like "you could consider..."
- Be specific and actionable.
- Keep each bullet point under 15 words.
- No mixing items and tasks.
- Scale quantities and complexity based on guest count.

Guest count ranges:
- 5-10: intimate gathering
- 10-20: medium party
- 20-40: larger event
- 40-75: big event needing coordination
- 75+: large-scale event

Hosting styles:
- potluck: Most items brought by guests, host provides venue/basics
- host_provides: Host provides most food/drinks, minimal guest contributions
- mixed: Combination of both

Duration impacts:
- 2-3 hrs: focused event, lighter refreshments
- 4+ hrs: more substantial food, multiple phases`;

    // Enhance mode: modify system prompt
    if (isEnhanceMode) {
      systemPrompt += `

ENHANCE MODE - CRITICAL INSTRUCTIONS:
- You are ENHANCING an existing event, NOT creating a new plan from scratch.
- The user already has items and tasks. Suggest ADDITIONAL complementary items only.
- DO NOT duplicate any existing items or tasks.
- Focus on filling gaps and adding variety to what already exists.
- Suggest fewer items (3-6 per category max) since this is supplemental.
- Keep the plan shorter and more focused.`;
    }

    let userPrompt = `Generate a complete event plan:

Event Type: ${eventType}
Guest Count Range: ${guestRange}
Duration: ${duration}
Hosting Style: ${hostingStyle}
Vibes: ${vibes?.length > 0 ? vibes.join(', ') : 'not specified'}
Event Date: ${eventDate || 'not specified'}
${notes ? `Additional Notes: ${notes}` : ''}`;

    // Enhance mode: add existing items/tasks context
    if (isEnhanceMode) {
      const existingItemNames = existingItems?.map((i: { name: string }) => i.name).join(', ') || 'none';
      const existingTaskTitles = existingTasks?.map((t: { title: string }) => t.title).join(', ') || 'none';
      
      userPrompt += `

EXISTING ITEMS (DO NOT DUPLICATE): ${existingItemNames}
EXISTING TASKS (DO NOT DUPLICATE): ${existingTaskTitles}

Generate ADDITIONAL complementary items and tasks that fill gaps and add variety. Do not repeat anything that already exists.`;
    } else {
      userPrompt += `

Create a practical, actionable plan with clear timeline, items list, host tasks, and tips.`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_event_plan',
              description: 'Generate a structured event plan with 5 sections',
              parameters: {
                type: 'object',
                properties: {
                  planName: { 
                    type: 'string', 
                    description: 'Creative event title (e.g., "Cozy Game Night Gathering")' 
                  },
                  planSummary: { 
                    type: 'string', 
                    description: 'One sentence describing the event feel (max 20 words)' 
                  },
                  timeline: {
                    type: 'object',
                    description: 'Grouped bullet lists for each time period',
                    properties: {
                      threeDaysBefore: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '2-4 short action items for 3-5 days before'
                      },
                      oneDayBefore: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '2-4 short action items for 1 day before'
                      },
                      dayOf: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '2-4 short action items for day of event'
                      },
                      oneHourBefore: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '2-3 short action items for 1 hour before'
                      },
                      duringEvent: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '2-3 short action items during the event'
                      }
                    },
                    required: ['threeDaysBefore', 'oneDayBefore', 'dayOf', 'oneHourBefore', 'duringEvent']
                  },
                  menuItems: {
                    type: 'array',
                    description: 'Categorized list of items needed',
                    items: {
                      type: 'object',
                      properties: {
                        category: { 
                          type: 'string',
                          description: 'Category name: Starters / Snacks, Main Dishes, Sides, Drinks, or Décor & Essentials'
                        },
                        items: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              name: { type: 'string', description: 'Item name' },
                              note: { type: 'string', description: 'Optional short note (e.g., "with crackers")' }
                            },
                            required: ['name']
                          }
                        }
                      },
                      required: ['category', 'items']
                    }
                  },
                  hostTodos: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '5-8 short, actionable host tasks'
                  },
                  setupTips: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '4-6 practical tips for layout, décor, guest flow, and ambiance'
                  }
                },
                required: ['planName', 'planSummary', 'timeline', 'menuItems', 'hostTodos', 'setupTips']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_event_plan' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Response received');

    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const eventPlan = JSON.parse(toolCall.function.arguments);
    console.log('Parsed event plan:', JSON.stringify(eventPlan, null, 2));
    
    return new Response(JSON.stringify({ 
      success: true,
      eventPlan 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating event plan:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

    // Rate limit check
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
    
    const isEnhanceMode = (existingItems && existingItems.length > 0) || (existingTasks && existingTasks.length > 0);

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Build the prompts
    let systemPrompt = `You are an expert event planner. Generate a complete, structured event plan.
CRITICAL RULES:
- No long paragraphs. Use short, actionable bullet points.
- Do not repeat user inputs.
- Keep points under 15 words.
- No mixing items and tasks.`;

    if (isEnhanceMode) {
      systemPrompt += `\nENHANCE MODE: Suggest ADDITIONAL items only. Do not duplicate existing ones.`;
    }

    let userPrompt = `Event: ${eventType}, Guests: ${guestRange}, Duration: ${duration}, Style: ${hostingStyle}.`;
    if (vibes?.length) userPrompt += ` Vibes: ${vibes.join(', ')}.`;
    if (notes) userPrompt += ` Notes: ${notes}.`;

    // Using gemini-2.0-flash-lite from your available list (most cost-efficient and highest rate limits)
    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }]
        }
      ],
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      tools: [
        {
          function_declarations: [
            {
              name: 'generate_event_plan',
              description: 'Generate a structured event plan',
              parameters: {
                type: 'object',
                properties: {
                  planName: { type: 'string' },
                  planSummary: { type: 'string' },
                  timeline: {
                    type: 'object',
                    properties: {
                      threeDaysBefore: { type: 'array', items: { type: 'string' } },
                      oneDayBefore: { type: 'array', items: { type: 'string' } },
                      dayOf: { type: 'array', items: { type: 'string' } },
                      oneHourBefore: { type: 'array', items: { type: 'string' } },
                      duringEvent: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['threeDaysBefore', 'oneDayBefore', 'dayOf', 'oneHourBefore', 'duringEvent']
                  },
                  menuItems: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        category: { type: 'string' },
                        items: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              note: { type: 'string' }
                            },
                            required: ['name']
                          }
                        }
                      },
                      required: ['category', 'items']
                    }
                  },
                  hostTodos: { type: 'array', items: { type: 'string' } },
                  setupTips: { type: 'array', items: { type: 'string' } }
                },
                required: ['planName', 'planSummary', 'timeline', 'menuItems', 'hostTodos', 'setupTips']
              }
            }
          ]
        }
      ],
      tool_config: {
        function_calling_config: {
          mode: "ANY",
          allowed_function_names: ["generate_event_plan"]
        }
      }
    };

    const response = await fetch(`${geminiUrl}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini error:', response.status, errorText);
      throw new Error(`Gemini error: ${response.status}`);
    }

    const data = await response.json();
    const part = data.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall);
    
    if (!part?.functionCall) {
      throw new Error('No function call in response');
    }

    return new Response(JSON.stringify({ 
      success: true,
      eventPlan: part.functionCall.args 
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

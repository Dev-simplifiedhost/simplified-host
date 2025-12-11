import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { getClientIp, isIpBlocked, checkRateLimit, createRateLimitResponse } from '../_shared/rateLimiting.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // IP blocking check
    const clientIp = getClientIp(req);
    const blocked = await isIpBlocked(supabaseClient, clientIp);
    if (blocked) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting - 10 refinements per 10 minutes
    const rateLimit = await checkRateLimit(supabaseClient, clientIp, 'refine-event-plan', 10, 10);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit, corsHeaders);
    }

    const { sectionToRefine, refinementPrompt, currentSection, planContext } = await req.json();

    if (!sectionToRefine || !refinementPrompt || !currentSection) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sectionToRefine, refinementPrompt, currentSection' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an AI assistant helping refine specific sections of an event plan.
Your task is to modify ONLY the specified section based on the user's refinement request.
Keep the same structure and format as the original section.
Be creative but practical. Make realistic suggestions.`;

    let userPrompt = '';
    let toolDefinition: any = null;

    if (sectionToRefine === 'menuItems') {
      userPrompt = `Current menu items section:
${JSON.stringify(currentSection, null, 2)}

Plan context: ${planContext?.planName || 'Event'} - ${planContext?.planSummary || ''}

User's refinement request: "${refinementPrompt}"

Generate an updated menu items section that incorporates the user's request.`;

      toolDefinition = {
        type: "function",
        function: {
          name: "refine_menu_items",
          description: "Return refined menu items section",
          parameters: {
            type: "object",
            properties: {
              menuItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          note: { type: "string" }
                        },
                        required: ["name"]
                      }
                    }
                  },
                  required: ["category", "items"]
                }
              }
            },
            required: ["menuItems"]
          }
        }
      };
    } else if (sectionToRefine === 'hostTodos') {
      userPrompt = `Current host to-dos:
${JSON.stringify(currentSection, null, 2)}

Plan context: ${planContext?.planName || 'Event'} - ${planContext?.planSummary || ''}

User's refinement request: "${refinementPrompt}"

Generate an updated host to-dos list that incorporates the user's request.`;

      toolDefinition = {
        type: "function",
        function: {
          name: "refine_host_todos",
          description: "Return refined host to-dos list",
          parameters: {
            type: "object",
            properties: {
              hostTodos: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["hostTodos"]
          }
        }
      };
    } else if (sectionToRefine === 'setupTips') {
      userPrompt = `Current setup tips:
${JSON.stringify(currentSection, null, 2)}

Plan context: ${planContext?.planName || 'Event'} - ${planContext?.planSummary || ''}

User's refinement request: "${refinementPrompt}"

Generate updated setup tips that incorporate the user's request.`;

      toolDefinition = {
        type: "function",
        function: {
          name: "refine_setup_tips",
          description: "Return refined setup tips",
          parameters: {
            type: "object",
            properties: {
              setupTips: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["setupTips"]
          }
        }
      };
    } else if (sectionToRefine === 'timeline') {
      userPrompt = `Current timeline:
${JSON.stringify(currentSection, null, 2)}

Plan context: ${planContext?.planName || 'Event'} - ${planContext?.planSummary || ''}

User's refinement request: "${refinementPrompt}"

Generate an updated timeline that incorporates the user's request.`;

      toolDefinition = {
        type: "function",
        function: {
          name: "refine_timeline",
          description: "Return refined timeline",
          parameters: {
            type: "object",
            properties: {
              timeline: {
                type: "object",
                properties: {
                  threeDaysBefore: { type: "array", items: { type: "string" } },
                  oneDayBefore: { type: "array", items: { type: "string" } },
                  dayOf: { type: "array", items: { type: "string" } },
                  oneHourBefore: { type: "array", items: { type: "string" } },
                  duringEvent: { type: "array", items: { type: "string" } }
                },
                required: ["threeDaysBefore", "oneDayBefore", "dayOf", "oneHourBefore", "duringEvent"]
              }
            },
            required: ["timeline"]
          }
        }
      };
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid sectionToRefine. Valid values: menuItems, hostTodos, setupTips, timeline' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling Lovable AI for section refinement:', sectionToRefine);

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
        tools: [toolDefinition],
        tool_choice: { type: "function", function: { name: toolDefinition.function.name } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI response received');

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('No tool call in AI response');
    }

    const refinedSection = JSON.parse(toolCall.function.arguments);
    console.log('Refined section:', sectionToRefine);

    return new Response(
      JSON.stringify({ 
        success: true,
        sectionToRefine,
        refinedSection 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in refine-event-plan:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

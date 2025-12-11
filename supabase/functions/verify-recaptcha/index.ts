import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { checkRateLimit, getClientIp, isIpBlocked, createRateLimitResponse, RATE_LIMITS } from '../_shared/rateLimiting.ts';

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
    const rateLimitConfig = RATE_LIMITS.VERIFY_RECAPTCHA;
    const rateLimitResult = await checkRateLimit(
      supabase,
      clientIp,
      'verify-recaptcha',
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMinutes
    );

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }
    const { token, action } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'No reCAPTCHA token provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const secretKey = Deno.env.get('RECAPTCHA_SECRET_KEY');
    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Verify the token with Google
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`,
    });

    const verifyData = await verifyResponse.json();
    
    console.log('reCAPTCHA verification:', {
      success: verifyData.success,
      score: verifyData.score,
      action: verifyData.action,
      expectedAction: action,
    });

    // Check if verification was successful
    if (!verifyData.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'reCAPTCHA verification failed',
          errorCodes: verifyData['error-codes']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check the score (v3 returns a score between 0.0 and 1.0)
    // 0.0 is very likely a bot, 1.0 is very likely a human
    const minScore = 0.5; // Adjust this threshold as needed
    if (verifyData.score < minScore) {
      console.warn(`Low reCAPTCHA score: ${verifyData.score} for action: ${action}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Suspicious activity detected',
          score: verifyData.score
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Verify the action matches (optional but recommended)
    if (action && verifyData.action !== action) {
      console.warn(`Action mismatch: expected ${action}, got ${verifyData.action}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Action verification failed' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // All checks passed
    return new Response(
      JSON.stringify({ 
        success: true, 
        score: verifyData.score,
        action: verifyData.action
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

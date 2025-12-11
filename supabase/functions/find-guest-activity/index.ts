import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, phone, countryCode } = await req.json();

    if (!name || !phone || !countryCode) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: name, phone, countryCode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Clean phone similar to client cleanPhoneNumber
    const cleanedPhone = phone.startsWith("+")
      ? phone.replace(/[^\d+]/g, "")
      : phone.replace(/\D/g, "");

    const onlyDigits = cleanedPhone.replace(/\D/g, "");
    const last7 = onlyDigits.slice(-7);
    const last10 = onlyDigits.slice(-10);

    // Basic input constraints
    const trimmedName = String(name).trim().slice(0, 120);
    const cc = String(countryCode).toUpperCase().slice(0, 2);

    // Build name pattern for case-insensitive matching
    const namePattern = `%${trimmedName.replace(/%/g, "")}%`;

    // Helper to normalize item claims rows
    const normalizeItems = (rows: any[] | null) => (rows || []).map((i: any) => ({
      ...i,
      item: i.event_items,
      event: i.events
    }));

    // First pass: strict match by full phone
    let { data: rsvps, error: rsvpError } = await supabase
      .from("rsvps")
      .select(
        "id, event_id, guest_name, guest_email, guest_phone, country_code, rsvp_status, guest_token, created_at, events(name, event_date, event_code)"
      )
      .eq("guest_phone", cleanedPhone)
      .eq("country_code", cc)
      .ilike("guest_name", namePattern)
      .order("created_at", { ascending: false });

    if (rsvpError) {
      console.error("find-guest-activity rsvps error", rsvpError);
    }

    // Fallback: partial match on last 7-10 digits if no exact results
    if (!rsvps || rsvps.length === 0) {
      const phonePattern7 = last7 ? `%${last7}` : undefined;
      const phonePattern10 = last10 ? `%${last10}` : undefined;

      if (phonePattern10) {
        const { data, error } = await supabase
          .from("rsvps")
          .select(
            "id, event_id, guest_name, guest_email, guest_phone, country_code, rsvp_status, guest_token, created_at, events(name, event_date, event_code)"
          )
          .eq("country_code", cc)
          .ilike("guest_name", namePattern)
          .like("guest_phone", phonePattern10)
          .order("created_at", { ascending: false });
        if (!error && data) rsvps = data;
      }

      if ((!rsvps || rsvps.length === 0) && phonePattern7) {
        const { data, error } = await supabase
          .from("rsvps")
          .select(
            "id, event_id, guest_name, guest_email, guest_phone, country_code, rsvp_status, guest_token, created_at, events(name, event_date, event_code)"
          )
          .eq("country_code", cc)
          .ilike("guest_name", namePattern)
          .like("guest_phone", phonePattern7)
          .order("created_at", { ascending: false });
        if (!error && data) rsvps = data;
      }
    }

    // Item claims: strict first
    let { data: itemClaims, error: claimsError } = await supabase
      .from("item_claims")
      .select(
        "id, event_id, rsvp_id, claim_type, contributor_name, contributor_phone, country_code, quantity_claimed, amount_contributed, payment_verified, created_at, event_items(name, category), events(name, event_date, event_code)"
      )
      .eq("contributor_phone", cleanedPhone)
      .eq("country_code", cc)
      .ilike("contributor_name", namePattern)
      .order("created_at", { ascending: false });

    if (claimsError) {
      console.error("find-guest-activity item_claims error", claimsError);
    }

    // Item claims fallback with partial phone
    if (!itemClaims || itemClaims.length === 0) {
      const phonePattern10 = last10 ? `%${last10}` : undefined;
      const phonePattern7 = last7 ? `%${last7}` : undefined;

      if (phonePattern10) {
        const { data, error } = await supabase
          .from("item_claims")
          .select(
            "id, event_id, rsvp_id, claim_type, contributor_name, contributor_phone, country_code, quantity_claimed, amount_contributed, payment_verified, created_at, event_items(name, category), events(name, event_date, event_code)"
          )
          .eq("country_code", cc)
          .ilike("contributor_name", namePattern)
          .like("contributor_phone", phonePattern10)
          .order("created_at", { ascending: false });
        if (!error && data) itemClaims = data;
      }

      if ((!itemClaims || itemClaims.length === 0) && phonePattern7) {
        const { data, error } = await supabase
          .from("item_claims")
          .select(
            "id, event_id, rsvp_id, claim_type, contributor_name, contributor_phone, country_code, quantity_claimed, amount_contributed, payment_verified, created_at, event_items(name, category), events(name, event_date, event_code)"
          )
          .eq("country_code", cc)
          .ilike("contributor_name", namePattern)
          .like("contributor_phone", phonePattern7)
          .order("created_at", { ascending: false });
        if (!error && data) itemClaims = data;
      }
    }

    const normalizedItems = normalizeItems(itemClaims || []);

    return new Response(
      JSON.stringify({ rsvps: rsvps || [], items: normalizedItems }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("find-guest-activity error", e);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

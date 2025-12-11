-- Update get_public_guest_list function to remove plus_one_name reference
DROP FUNCTION IF EXISTS public.get_public_guest_list(uuid);

CREATE OR REPLACE FUNCTION public.get_public_guest_list(p_event_id uuid)
RETURNS TABLE(
  guest_name text, 
  rsvp_status text, 
  additional_guests jsonb,
  dietary_preferences text[]
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    rsvps.guest_name,
    rsvps.rsvp_status,
    rsvps.additional_guests,
    rsvps.dietary_preferences
  FROM rsvps
  JOIN events ON events.id = rsvps.event_id
  WHERE rsvps.event_id = p_event_id
    AND events.show_guest_list = true
    AND rsvps.rsvp_status IN ('attending', 'maybe')
  ORDER BY rsvps.created_at DESC;
$function$;

-- Update get_my_rsvp function to remove plus_one_name reference
DROP FUNCTION IF EXISTS public.get_my_rsvp(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_my_rsvp(p_event_id uuid, p_guest_token uuid)
RETURNS TABLE(
  id uuid, 
  event_id uuid, 
  guest_name text, 
  guest_email text, 
  guest_phone text, 
  country_code text, 
  rsvp_status text, 
  message text, 
  additional_guests jsonb,
  dietary_preferences text[], 
  dietary_other text, 
  dietary_allergy text,
  guest_token uuid, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    id, event_id, guest_name, guest_email, guest_phone, 
    country_code, rsvp_status, message, additional_guests,
    dietary_preferences, dietary_other, dietary_allergy,
    guest_token, created_at, updated_at
  FROM rsvps
  WHERE rsvps.event_id = p_event_id
    AND rsvps.guest_token = p_guest_token
  LIMIT 1;
$function$;

-- Update find_my_rsvp function to remove plus_one_name reference
DROP FUNCTION IF EXISTS public.find_my_rsvp(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.find_my_rsvp(
  p_event_id uuid, 
  p_guest_name text, 
  p_guest_phone text, 
  p_country_code text
)
RETURNS TABLE(
  id uuid, 
  event_id uuid, 
  guest_name text, 
  guest_email text, 
  guest_phone text, 
  country_code text, 
  rsvp_status text, 
  message text, 
  additional_guests jsonb,
  dietary_preferences text[], 
  dietary_other text, 
  dietary_allergy text, 
  guest_token uuid, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    id, event_id, guest_name, guest_email, guest_phone,
    country_code, rsvp_status, message, additional_guests,
    dietary_preferences, dietary_other, dietary_allergy,
    guest_token, created_at, updated_at
  FROM rsvps
  WHERE rsvps.event_id = p_event_id
    AND rsvps.guest_name = p_guest_name
    AND rsvps.guest_phone = p_guest_phone
    AND rsvps.country_code = p_country_code
  LIMIT 1;
$function$;
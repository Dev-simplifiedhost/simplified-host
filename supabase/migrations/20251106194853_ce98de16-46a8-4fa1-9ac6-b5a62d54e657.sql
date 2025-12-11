create or replace function public.get_my_rsvp_full(
  p_event_id uuid,
  p_guest_token uuid
)
returns public.rsvps
language sql
security definer
set search_path = public
as $$
  select r.*
  from public.rsvps r
  where r.event_id = p_event_id
    and r.guest_token = p_guest_token
  limit 1;
$$;
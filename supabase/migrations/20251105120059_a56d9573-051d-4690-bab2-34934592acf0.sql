-- Drop the old policy that allowed anyone to insert comments
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.event_comments;

-- Create new policy that requires RSVP with attending or maybe status
CREATE POLICY "Only RSVPd guests can insert comments"
  ON public.event_comments
  FOR INSERT
  WITH CHECK (
    commenter_email IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.rsvps
      WHERE rsvps.event_id = event_comments.event_id
      AND LOWER(rsvps.guest_email) = LOWER(event_comments.commenter_email)
      AND rsvps.rsvp_status IN ('attending', 'maybe')
    )
  );
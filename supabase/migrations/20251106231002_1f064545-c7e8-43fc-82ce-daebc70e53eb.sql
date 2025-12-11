-- Allow guests to update their own pending comments within 15 minutes
CREATE POLICY "Guests can update their own pending comments"
ON public.event_comments
FOR UPDATE
USING (
  status = 'pending' 
  AND is_host_reply = false
  AND commenter_email IS NOT NULL
  AND commenter_email != ''
  AND created_at > (now() - INTERVAL '15 minutes')
  AND (
    -- Match by email from RSVP (case-insensitive)
    EXISTS (
      SELECT 1 FROM rsvps
      WHERE rsvps.event_id = event_comments.event_id
      AND lower(rsvps.guest_email) = lower(event_comments.commenter_email)
      AND rsvps.rsvp_status IN ('attending', 'maybe')
    )
  )
)
WITH CHECK (
  status = 'pending'
  AND is_host_reply = false
);

-- Allow guests to delete their own pending comments within 15 minutes
CREATE POLICY "Guests can delete their own pending comments"
ON public.event_comments
FOR DELETE
USING (
  status = 'pending'
  AND is_host_reply = false
  AND commenter_email IS NOT NULL
  AND commenter_email != ''
  AND created_at > (now() - INTERVAL '15 minutes')
  AND (
    -- Match by email from RSVP (case-insensitive)
    EXISTS (
      SELECT 1 FROM rsvps
      WHERE rsvps.event_id = event_comments.event_id
      AND lower(rsvps.guest_email) = lower(event_comments.commenter_email)
      AND rsvps.rsvp_status IN ('attending', 'maybe')
    )
  )
);
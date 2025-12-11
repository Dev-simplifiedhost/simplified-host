-- Add rsvp_id column to event_comments table to link comments with RSVPs
ALTER TABLE public.event_comments 
ADD COLUMN rsvp_id UUID REFERENCES public.rsvps(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_event_comments_rsvp_id ON public.event_comments(rsvp_id);

-- Add comment for documentation
COMMENT ON COLUMN public.event_comments.rsvp_id IS 'Links to the RSVP that created this comment, used for validation and tracking';
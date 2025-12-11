-- Create RSVPs table for guest responses
CREATE TABLE public.rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  rsvp_status TEXT NOT NULL CHECK (rsvp_status IN ('attending', 'maybe', 'not_attending')),
  message TEXT,
  plus_one_name TEXT,
  source TEXT DEFAULT 'link' CHECK (source IN ('link', 'code', 'qr')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

-- Anyone can view RSVPs for events
CREATE POLICY "Anyone can view RSVPs"
ON public.rsvps
FOR SELECT
USING (true);

-- Anyone can create RSVPs (for attendees)
CREATE POLICY "Anyone can create RSVPs"
ON public.rsvps
FOR INSERT
WITH CHECK (true);

-- Guests can update their own RSVPs using their token
CREATE POLICY "Guests can update their own RSVPs"
ON public.rsvps
FOR UPDATE
USING (true);

-- Event hosts can delete RSVPs for their events
CREATE POLICY "Event hosts can delete RSVPs"
ON public.rsvps
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = rsvps.event_id
    AND events.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_rsvps_updated_at
BEFORE UPDATE ON public.rsvps
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_rsvps_event_id ON public.rsvps(event_id);
CREATE INDEX idx_rsvps_guest_token ON public.rsvps(guest_token);
CREATE INDEX idx_rsvps_status ON public.rsvps(rsvp_status);

-- Enable realtime for RSVPs
ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvps;
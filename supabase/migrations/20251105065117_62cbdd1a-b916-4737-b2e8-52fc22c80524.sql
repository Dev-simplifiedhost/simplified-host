-- Create grocery lists table
CREATE TABLE IF NOT EXISTS public.grocery_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'Grocery List',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  serving_multiplier NUMERIC DEFAULT 1.0,
  guest_count INTEGER,
  notes TEXT,
  is_public BOOLEAN DEFAULT false,
  share_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Event owners can manage grocery lists"
  ON public.grocery_lists
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = grocery_lists.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view public grocery lists via share token"
  ON public.grocery_lists
  FOR SELECT
  USING (is_public = true);

-- Trigger for updated_at
CREATE TRIGGER handle_grocery_lists_updated_at
  BEFORE UPDATE ON public.grocery_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add index for faster lookups
CREATE INDEX idx_grocery_lists_event_id ON public.grocery_lists(event_id);
CREATE INDEX idx_grocery_lists_share_token ON public.grocery_lists(share_token);
-- Create event_kpi_settings table
CREATE TABLE IF NOT EXISTS public.event_kpi_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  kpi_type TEXT NOT NULL CHECK (kpi_type IN ('event_details', 'items_available', 'contribute', 'rsvp')),
  is_visible BOOLEAN DEFAULT true NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,
  custom_title TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(event_id, kpi_type)
);

-- Enable RLS
ALTER TABLE public.event_kpi_settings ENABLE ROW LEVEL SECURITY;

-- Public can view KPI settings
CREATE POLICY "Public can view KPI settings"
  ON public.event_kpi_settings FOR SELECT
  USING (true);

-- Event owners can manage their KPI settings
CREATE POLICY "Event owners can manage KPI settings"
  ON public.event_kpi_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_kpi_settings.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_kpi_settings_event_id ON public.event_kpi_settings(event_id);

-- Create trigger function to create default KPI settings for new events
CREATE OR REPLACE FUNCTION public.create_default_kpi_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default KPI tiles for new events
  INSERT INTO public.event_kpi_settings (event_id, kpi_type, is_visible, display_order)
  VALUES 
    (NEW.id, 'event_details', true, 1),
    (NEW.id, 'items_available', true, 2),
    (NEW.id, 'contribute', true, 3),
    (NEW.id, 'rsvp', true, 4)
  ON CONFLICT (event_id, kpi_type) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create KPI settings
DROP TRIGGER IF EXISTS create_event_kpi_settings ON public.events;
CREATE TRIGGER create_event_kpi_settings
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_kpi_settings();

-- Backfill existing events with default KPI settings
INSERT INTO public.event_kpi_settings (event_id, kpi_type, is_visible, display_order)
SELECT 
  e.id,
  kpi.kpi_type,
  true,
  kpi.display_order
FROM public.events e
CROSS JOIN (
  VALUES 
    ('event_details', 1),
    ('items_available', 2),
    ('contribute', 3),
    ('rsvp', 4)
) AS kpi(kpi_type, display_order)
ON CONFLICT (event_id, kpi_type) DO NOTHING;
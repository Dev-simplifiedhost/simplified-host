-- Create function to check announcement limit
CREATE OR REPLACE FUNCTION public.check_announcement_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.announcements WHERE event_id = NEW.event_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 announcements per event reached';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce limit on insert
DROP TRIGGER IF EXISTS enforce_announcement_limit ON public.announcements;
CREATE TRIGGER enforce_announcement_limit
BEFORE INSERT ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.check_announcement_limit();
-- Add event_code column for shareable codes
ALTER TABLE public.events 
ADD COLUMN event_code text UNIQUE;

-- Create function to generate random 6-character event code
CREATE OR REPLACE FUNCTION public.generate_event_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude similar looking chars
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Create trigger to auto-generate event code on insert
CREATE OR REPLACE FUNCTION public.set_event_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_code IS NULL THEN
    -- Keep trying until we get a unique code
    LOOP
      NEW.event_code := generate_event_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM events WHERE event_code = NEW.event_code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_event_code_trigger
BEFORE INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.set_event_code();
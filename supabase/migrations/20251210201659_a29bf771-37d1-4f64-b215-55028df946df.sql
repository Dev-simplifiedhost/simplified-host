-- Add include_in_export to event_items
ALTER TABLE public.event_items 
ADD COLUMN include_in_export BOOLEAN DEFAULT false;

-- Add include_in_export to tasks
ALTER TABLE public.tasks 
ADD COLUMN include_in_export BOOLEAN DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN public.event_items.include_in_export IS 'Whether this item appears in the shared plan/export. PWAC items default to true, manual items to false.';
COMMENT ON COLUMN public.tasks.include_in_export IS 'Whether this task appears in the shared plan/export. PWAC tasks default to true, manual tasks to false.';
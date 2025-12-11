-- Function to safely delete a user account and all associated data
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete user's events (will cascade to related tables via foreign keys)
  DELETE FROM public.events WHERE user_id = v_user_id;
  
  -- Delete activities
  DELETE FROM public.activities WHERE user_id = v_user_id;
  
  -- Delete collaborations
  DELETE FROM public.event_collaborators WHERE user_id = v_user_id;
  
  -- Delete user templates
  DELETE FROM public.user_templates WHERE user_id = v_user_id;
  
  -- Delete user consents
  DELETE FROM public.user_consents WHERE user_id = v_user_id;
  
  -- Delete profile (has CASCADE on delete from auth.users)
  DELETE FROM public.profiles WHERE id = v_user_id;
  
  -- Delete the auth user (this is the final step)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- Ensure proper CASCADE deletes are set up on events table
DO $$ 
BEGIN
  -- Add CASCADE to foreign keys if they don't have it
  -- This ensures when events are deleted, all related data is cleaned up
  
  -- RSVPs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints 
    WHERE constraint_name = 'rsvps_event_id_fkey' 
    AND delete_rule = 'CASCADE'
  ) THEN
    ALTER TABLE public.rsvps DROP CONSTRAINT IF EXISTS rsvps_event_id_fkey;
    ALTER TABLE public.rsvps 
      ADD CONSTRAINT rsvps_event_id_fkey 
      FOREIGN KEY (event_id) 
      REFERENCES public.events(id) 
      ON DELETE CASCADE;
  END IF;

  -- Event items
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints 
    WHERE constraint_name = 'event_items_event_id_fkey' 
    AND delete_rule = 'CASCADE'
  ) THEN
    ALTER TABLE public.event_items DROP CONSTRAINT IF EXISTS event_items_event_id_fkey;
    ALTER TABLE public.event_items 
      ADD CONSTRAINT event_items_event_id_fkey 
      FOREIGN KEY (event_id) 
      REFERENCES public.events(id) 
      ON DELETE CASCADE;
  END IF;

  -- Tasks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints 
    WHERE constraint_name = 'tasks_event_id_fkey' 
    AND delete_rule = 'CASCADE'
  ) THEN
    ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_event_id_fkey;
    ALTER TABLE public.tasks 
      ADD CONSTRAINT tasks_event_id_fkey 
      FOREIGN KEY (event_id) 
      REFERENCES public.events(id) 
      ON DELETE CASCADE;
  END IF;

  -- Announcements
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints 
    WHERE constraint_name = 'announcements_event_id_fkey' 
    AND delete_rule = 'CASCADE'
  ) THEN
    ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_event_id_fkey;
    ALTER TABLE public.announcements 
      ADD CONSTRAINT announcements_event_id_fkey 
      FOREIGN KEY (event_id) 
      REFERENCES public.events(id) 
      ON DELETE CASCADE;
  END IF;

  -- Reminders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints 
    WHERE constraint_name = 'reminders_event_id_fkey' 
    AND delete_rule = 'CASCADE'
  ) THEN
    ALTER TABLE public.reminders DROP CONSTRAINT IF EXISTS reminders_event_id_fkey;
    ALTER TABLE public.reminders 
      ADD CONSTRAINT reminders_event_id_fkey 
      FOREIGN KEY (event_id) 
      REFERENCES public.events(id) 
      ON DELETE CASCADE;
  END IF;

  -- Event collaborators
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints 
    WHERE constraint_name = 'event_collaborators_event_id_fkey' 
    AND delete_rule = 'CASCADE'
  ) THEN
    ALTER TABLE public.event_collaborators DROP CONSTRAINT IF EXISTS event_collaborators_event_id_fkey;
    ALTER TABLE public.event_collaborators 
      ADD CONSTRAINT event_collaborators_event_id_fkey 
      FOREIGN KEY (event_id) 
      REFERENCES public.events(id) 
      ON DELETE CASCADE;
  END IF;

  -- Contributions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints 
    WHERE constraint_name = 'contributions_event_id_fkey' 
    AND delete_rule = 'CASCADE'
  ) THEN
    ALTER TABLE public.contributions DROP CONSTRAINT IF EXISTS contributions_event_id_fkey;
    ALTER TABLE public.contributions 
      ADD CONSTRAINT contributions_event_id_fkey 
      FOREIGN KEY (event_id) 
      REFERENCES public.events(id) 
      ON DELETE CASCADE;
  END IF;

  -- Grocery lists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints 
    WHERE constraint_name = 'grocery_lists_event_id_fkey' 
    AND delete_rule = 'CASCADE'
  ) THEN
    ALTER TABLE public.grocery_lists DROP CONSTRAINT IF EXISTS grocery_lists_event_id_fkey;
    ALTER TABLE public.grocery_lists 
      ADD CONSTRAINT grocery_lists_event_id_fkey 
      FOREIGN KEY (event_id) 
      REFERENCES public.events(id) 
      ON DELETE CASCADE;
  END IF;

  -- Task categories
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints 
    WHERE constraint_name = 'task_categories_event_id_fkey' 
    AND delete_rule = 'CASCADE'
  ) THEN
    ALTER TABLE public.task_categories DROP CONSTRAINT IF EXISTS task_categories_event_id_fkey;
    ALTER TABLE public.task_categories 
      ADD CONSTRAINT task_categories_event_id_fkey 
      FOREIGN KEY (event_id) 
      REFERENCES public.events(id) 
      ON DELETE CASCADE;
  END IF;
END $$;
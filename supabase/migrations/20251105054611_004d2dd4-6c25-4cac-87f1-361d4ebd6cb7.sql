-- Create enum for task priority
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');

-- Create enum for task status
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done');

-- Create task_categories table
CREATE TABLE IF NOT EXISTS public.task_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#3B82F6',
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, name)
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category_id uuid REFERENCES task_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority DEFAULT 'medium',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  due_date timestamp with time zone,
  due_relative_days integer,
  completed_at timestamp with time zone,
  completed_by uuid REFERENCES auth.users(id),
  parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  is_template boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create task_notes table
CREATE TABLE IF NOT EXISTS public.task_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  note text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_tasks_event_id ON tasks(event_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_task_categories_event_id ON task_categories(event_id);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Event owners and collaborators can view tasks"
  ON tasks FOR SELECT
  USING (
    public.is_event_owner(event_id, auth.uid()) OR
    public.is_event_collaborator(event_id, auth.uid())
  );

CREATE POLICY "Event owners and authorized collaborators can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    public.is_event_owner(event_id, auth.uid()) OR
    public.has_permission(event_id, auth.uid(), 'manage_tasks')
  );

CREATE POLICY "Event owners and collaborators can update tasks"
  ON tasks FOR UPDATE
  USING (
    public.is_event_owner(event_id, auth.uid()) OR
    public.is_event_collaborator(event_id, auth.uid())
  );

CREATE POLICY "Event owners can delete tasks"
  ON tasks FOR DELETE
  USING (
    public.is_event_owner(event_id, auth.uid()) OR
    public.has_permission(event_id, auth.uid(), 'delete_content')
  );

-- RLS Policies for task_categories
CREATE POLICY "Event owners and collaborators can view categories"
  ON task_categories FOR SELECT
  USING (
    public.is_event_owner(event_id, auth.uid()) OR
    public.is_event_collaborator(event_id, auth.uid())
  );

CREATE POLICY "Event owners can manage categories"
  ON task_categories FOR ALL
  USING (public.is_event_owner(event_id, auth.uid()));

-- RLS Policies for task_notes
CREATE POLICY "Users can view notes on tasks they have access to"
  ON task_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_notes.task_id
      AND (
        public.is_event_owner(tasks.event_id, auth.uid()) OR
        public.is_event_collaborator(tasks.event_id, auth.uid())
      )
    )
  );

CREATE POLICY "Users can add notes to tasks they have access to"
  ON task_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_notes.task_id
      AND (
        public.is_event_owner(tasks.event_id, auth.uid()) OR
        public.is_event_collaborator(tasks.event_id, auth.uid())
      )
    )
  );

-- Triggers
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Function to update task completion
CREATE OR REPLACE FUNCTION complete_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at := now();
    NEW.completed_by := auth.uid();
    
    -- Log activity
    INSERT INTO activities (user_id, event_id, activity_type, activity_data)
    SELECT 
      (SELECT user_id FROM events WHERE id = NEW.event_id),
      NEW.event_id,
      'task_completed',
      jsonb_build_object(
        'task_title', NEW.title,
        'completed_by', auth.uid()
      );
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at := NULL;
    NEW.completed_by := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_complete
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION complete_task();

-- Insert default categories
INSERT INTO task_categories (event_id, name, color, sort_order)
SELECT DISTINCT e.id, cat.name, cat.color, cat.sort_order
FROM events e
CROSS JOIN (
  VALUES 
    ('Setup', '#3B82F6', 1),
    ('Supplies', '#10B981', 2),
    ('Decor', '#8B5CF6', 3),
    ('Guest Coordination', '#F59E0B', 4),
    ('Follow-Up', '#6B7280', 5)
) AS cat(name, color, sort_order)
ON CONFLICT (event_id, name) DO NOTHING;
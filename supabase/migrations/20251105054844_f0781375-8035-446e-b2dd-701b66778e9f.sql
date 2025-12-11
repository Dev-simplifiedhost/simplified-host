-- Create task_templates table for static suggested tasks
CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  timeline_group text NOT NULL CHECK (timeline_group IN ('before', 'day_of', 'after')),
  title text NOT NULL,
  description text,
  priority task_priority DEFAULT 'medium',
  category text,
  sort_order integer DEFAULT 0,
  is_system_template boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Create user_templates table for custom saved templates
CREATE TABLE IF NOT EXISTS public.user_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  event_type text,
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_task_templates_event_type ON task_templates(event_type);
CREATE INDEX idx_user_templates_user_id ON user_templates(user_id);

-- Enable RLS
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_templates (public read)
CREATE POLICY "Anyone can view task templates"
  ON task_templates FOR SELECT
  USING (true);

-- RLS Policies for user_templates
CREATE POLICY "Users can view their own templates"
  ON user_templates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own templates"
  ON user_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON user_templates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON user_templates FOR DELETE
  USING (user_id = auth.uid());

-- Trigger for user_templates
CREATE TRIGGER set_user_templates_updated_at
  BEFORE UPDATE ON user_templates
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Insert default task templates for common event types
INSERT INTO task_templates (event_type, timeline_group, title, description, category, sort_order) VALUES
-- Friendsgiving
('friendsgiving', 'before', 'Send invitations', 'Share event details with guests at least 2 weeks ahead', 'Guest Coordination', 1),
('friendsgiving', 'before', 'Plan menu', 'Coordinate dishes - assign who brings what', 'Supplies', 2),
('friendsgiving', 'before', 'Buy groceries', 'Shop for main dishes and ingredients 2-3 days before', 'Supplies', 3),
('friendsgiving', 'before', 'Prep decorations', 'Get table settings, candles, fall decor', 'Decor', 4),
('friendsgiving', 'before', 'Confirm dietary restrictions', 'Check for allergies or preferences', 'Guest Coordination', 5),
('friendsgiving', 'day_of', 'Set the table', 'Arrange plates, utensils, and centerpieces', 'Setup', 6),
('friendsgiving', 'day_of', 'Cook main dishes', 'Start cooking early - turkey needs time!', 'Supplies', 7),
('friendsgiving', 'day_of', 'Create welcome playlist', 'Set the mood with background music', 'Setup', 8),
('friendsgiving', 'after', 'Send thank you messages', 'Thank guests for coming and their contributions', 'Follow-Up', 9),
('friendsgiving', 'after', 'Share photos', 'Post group photos or create shared album', 'Follow-Up', 10),

-- Birthday Party
('birthday', 'before', 'Send invitations', 'Invite guests 2-3 weeks ahead', 'Guest Coordination', 1),
('birthday', 'before', 'Order cake', 'Book bakery or plan homemade option', 'Supplies', 2),
('birthday', 'before', 'Plan activities/games', 'Prepare entertainment for guests', 'Setup', 3),
('birthday', 'before', 'Buy decorations', 'Balloons, banners, party supplies', 'Decor', 4),
('birthday', 'before', 'Get party favors', 'Small gifts for guests to take home', 'Supplies', 5),
('birthday', 'day_of', 'Decorate venue', 'Set up balloons, banners, and table settings', 'Setup', 6),
('birthday', 'day_of', 'Prepare food & drinks', 'Set out snacks and beverages', 'Supplies', 7),
('birthday', 'day_of', 'Set up music/entertainment', 'Test speakers and playlist', 'Setup', 8),
('birthday', 'after', 'Thank guests', 'Send appreciation messages', 'Follow-Up', 9),
('birthday', 'after', 'Share party photos', 'Create and share photo album', 'Follow-Up', 10),

-- Office Party
('office_party', 'before', 'Book venue/meeting room', 'Reserve space for the event', 'Setup', 1),
('office_party', 'before', 'Send calendar invites', 'Add event to team calendars', 'Guest Coordination', 2),
('office_party', 'before', 'Order catering', 'Arrange food delivery or catering service', 'Supplies', 3),
('office_party', 'before', 'Plan activities', 'Organize team games or icebreakers', 'Setup', 4),
('office_party', 'before', 'Get decorations', 'Keep it professional but festive', 'Decor', 5),
('office_party', 'day_of', 'Set up space', 'Arrange tables, chairs, and decorations', 'Setup', 6),
('office_party', 'day_of', 'Test AV equipment', 'Check microphone, projector if needed', 'Setup', 7),
('office_party', 'day_of', 'Welcome guests', 'Greet attendees as they arrive', 'Setup', 8),
('office_party', 'after', 'Send recap email', 'Share highlights and thank attendees', 'Follow-Up', 9),
('office_party', 'after', 'Clean up venue', 'Return space to original state', 'Follow-Up', 10),

-- Dinner Party
('dinner', 'before', 'Plan menu', 'Choose recipes and courses', 'Supplies', 1),
('dinner', 'before', 'Send invitations', 'Invite guests 1-2 weeks ahead', 'Guest Coordination', 2),
('dinner', 'before', 'Shop for ingredients', 'Buy fresh ingredients 1-2 days before', 'Supplies', 3),
('dinner', 'before', 'Choose wine/beverages', 'Select drinks to complement meal', 'Supplies', 4),
('dinner', 'before', 'Prep table setting', 'Set up dinnerware and centerpiece', 'Decor', 5),
('dinner', 'day_of', 'Prep ingredients', 'Chop vegetables, marinate proteins early', 'Supplies', 6),
('dinner', 'day_of', 'Set ambiance', 'Arrange lighting and music', 'Setup', 7),
('dinner', 'day_of', 'Final cooking', 'Time dishes to finish together', 'Supplies', 8),
('dinner', 'after', 'Thank guests', 'Send appreciation messages', 'Follow-Up', 9),
('dinner', 'after', 'Share recipes', 'If requested, share dish recipes', 'Follow-Up', 10),

-- Holiday Party
('holiday', 'before', 'Send invitations', 'Invite guests 3-4 weeks ahead for holidays', 'Guest Coordination', 1),
('holiday', 'before', 'Plan menu', 'Consider traditional holiday dishes', 'Supplies', 2),
('holiday', 'before', 'Buy decorations', 'Seasonal decor, lights, ornaments', 'Decor', 3),
('holiday', 'before', 'Shop for gifts/favors', 'Party favors or host gifts', 'Supplies', 4),
('holiday', 'before', 'Confirm guest count', 'Get final headcount for food planning', 'Guest Coordination', 5),
('holiday', 'day_of', 'Decorate space', 'Put up all holiday decorations', 'Setup', 6),
('holiday', 'day_of', 'Prepare food', 'Cook main dishes and appetizers', 'Supplies', 7),
('holiday', 'day_of', 'Set up drink station', 'Arrange hot cocoa, punch, or cocktails', 'Setup', 8),
('holiday', 'after', 'Send thank you cards', 'Holiday-themed appreciation notes', 'Follow-Up', 9),
('holiday', 'after', 'Share memories', 'Post photos or create holiday album', 'Follow-Up', 10);

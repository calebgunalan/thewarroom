-- Badges table for achievement definitions
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  category TEXT NOT NULL DEFAULT 'general',
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User badges (earned achievements)
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Add recurrence fields to meetings
ALTER TABLE public.meetings 
ADD COLUMN recurrence_type TEXT DEFAULT NULL,
ADD COLUMN recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN recurrence_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN parent_meeting_id UUID REFERENCES public.meetings(id) DEFAULT NULL;

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Badges policies
CREATE POLICY "Anyone can view badges"
ON public.badges FOR SELECT
USING (true);

CREATE POLICY "Admins can manage badges"
ON public.badges FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- User badges policies
CREATE POLICY "Anyone can view user badges"
ON public.user_badges FOR SELECT
USING (true);

CREATE POLICY "System can insert user badges"
ON public.user_badges FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default badges
INSERT INTO public.badges (name, description, icon, category, requirement_type, requirement_value, points) VALUES
-- Task badges
('First Step', 'Complete your first task', 'footprints', 'tasks', 'tasks_completed', 1, 10),
('Task Master', 'Complete 10 tasks', 'target', 'tasks', 'tasks_completed', 10, 50),
('Productivity Pro', 'Complete 25 tasks', 'rocket', 'tasks', 'tasks_completed', 25, 100),
('Task Legend', 'Complete 50 tasks', 'crown', 'tasks', 'tasks_completed', 50, 200),
-- Reputation badges
('Rising Star', 'Reach 50 reputation points', 'star', 'reputation', 'reputation_score', 50, 25),
('Community Leader', 'Reach 200 reputation points', 'shield', 'reputation', 'reputation_score', 200, 75),
('War Room Elite', 'Reach 500 reputation points', 'gem', 'reputation', 'reputation_score', 500, 150),
-- Activity badges
('Conversation Starter', 'Create your first thread', 'message-square', 'activity', 'threads_created', 1, 15),
('Discussion Driver', 'Create 10 threads', 'messages-square', 'activity', 'threads_created', 10, 50),
('Active Contributor', 'Make 25 posts', 'pen-tool', 'activity', 'posts_created', 25, 60),
('Prolific Writer', 'Make 100 posts', 'book-open', 'activity', 'posts_created', 100, 150),
-- Voting badges
('Helpful Hand', 'Receive 10 upvotes', 'thumbs-up', 'voting', 'upvotes_received', 10, 30),
('Community Favorite', 'Receive 50 upvotes', 'heart', 'voting', 'upvotes_received', 50, 100),
-- Meeting badges
('Team Player', 'Attend 5 meetings', 'users', 'meetings', 'meetings_attended', 5, 40),
('Meeting Maven', 'Attend 20 meetings', 'calendar-check', 'meetings', 'meetings_attended', 20, 100);
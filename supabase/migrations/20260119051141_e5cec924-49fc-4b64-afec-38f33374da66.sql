-- Activity feed table for real-time updates
CREATE TABLE public.activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Push subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Activity feed policies (everyone can see all activities)
CREATE POLICY "Anyone can view activity feed"
ON public.activity_feed FOR SELECT
USING (true);

CREATE POLICY "System can insert activities"
ON public.activity_feed FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Push subscriptions policies
CREATE POLICY "Users can manage own subscriptions"
ON public.push_subscriptions FOR ALL
USING (auth.uid() = user_id);

-- Enable realtime for activity feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;

-- Create function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  _user_id UUID,
  _activity_type TEXT,
  _title TEXT,
  _description TEXT DEFAULT NULL,
  _link TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.activity_feed (user_id, activity_type, title, description, link, metadata)
  VALUES (_user_id, _activity_type, _title, _description, _link, _metadata)
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;

-- Trigger to log task completions
CREATE OR REPLACE FUNCTION public.on_task_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM public.log_activity(
      NEW.assigned_to,
      'task_completed',
      'Task Completed',
      NEW.title,
      '/tasks',
      jsonb_build_object('task_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER task_completed_trigger
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.on_task_completed();

-- Trigger to log new threads
CREATE OR REPLACE FUNCTION public.on_thread_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_activity(
    NEW.author_id,
    'thread_created',
    'New Discussion',
    NEW.title,
    '/threads/' || NEW.id,
    jsonb_build_object('thread_id', NEW.id, 'category', NEW.category)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER thread_created_trigger
AFTER INSERT ON public.threads
FOR EACH ROW
EXECUTE FUNCTION public.on_thread_created();

-- Trigger to log badge earned
CREATE OR REPLACE FUNCTION public.on_badge_earned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  badge_name TEXT;
BEGIN
  SELECT name INTO badge_name FROM public.badges WHERE id = NEW.badge_id;
  
  PERFORM public.log_activity(
    NEW.user_id,
    'badge_earned',
    'Badge Earned',
    badge_name,
    '/profile',
    jsonb_build_object('badge_id', NEW.badge_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER badge_earned_trigger
AFTER INSERT ON public.user_badges
FOR EACH ROW
EXECUTE FUNCTION public.on_badge_earned();
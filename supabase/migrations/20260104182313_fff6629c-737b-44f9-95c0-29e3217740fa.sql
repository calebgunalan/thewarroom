-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create chat rooms table for group chat
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on chat rooms
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat rooms
CREATE POLICY "Authenticated users can view public rooms"
  ON public.chat_rooms FOR SELECT
  USING (is_private = false OR auth.uid() = created_by);

CREATE POLICY "Authenticated users can create rooms"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Create chat room messages table
CREATE TABLE public.chat_room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on chat room messages
ALTER TABLE public.chat_room_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat room messages
CREATE POLICY "Users can view room messages"
  ON public.chat_room_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chat_rooms 
    WHERE id = room_id AND (is_private = false OR created_by = auth.uid())
  ));

CREATE POLICY "Authenticated users can send messages"
  ON public.chat_room_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Add image_url and audio_url to direct messages
ALTER TABLE public.messages ADD COLUMN image_url TEXT;
ALTER TABLE public.messages ADD COLUMN audio_url TEXT;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room_messages;

-- Create function to send notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _type TEXT,
  _title TEXT,
  _message TEXT,
  _link TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (_user_id, _type, _title, _message, _link)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Create trigger to notify on new task assignment
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_notification(
    NEW.assigned_to,
    'task_assigned',
    'New Task Assigned',
    'You have been assigned a new task: ' || NEW.title,
    '/tasks'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_assigned
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assigned();

-- Create trigger to notify on new message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT username INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  
  PERFORM public.create_notification(
    NEW.recipient_id,
    'new_message',
    'New Message',
    'You have a new message from ' || COALESCE(sender_name, 'a member'),
    '/messages'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

-- Create trigger to notify on post reply
CREATE OR REPLACE FUNCTION public.notify_post_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  thread_author UUID;
  thread_title TEXT;
BEGIN
  SELECT author_id, title INTO thread_author, thread_title 
  FROM public.threads WHERE id = NEW.thread_id;
  
  IF thread_author != NEW.author_id THEN
    PERFORM public.create_notification(
      thread_author,
      'thread_reply',
      'New Reply',
      'Someone replied to your thread: ' || thread_title,
      '/threads/' || NEW.thread_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_post_reply
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_reply();
-- Create meeting agenda items table
CREATE TABLE public.meeting_agenda_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 5,
  order_index INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for agenda items
CREATE POLICY "Anyone can view agenda items"
  ON public.meeting_agenda_items
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert agenda items"
  ON public.meeting_agenda_items
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creator or admins can update agenda items"
  ON public.meeting_agenda_items
  FOR UPDATE
  USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Creator or admins can delete agenda items"
  ON public.meeting_agenda_items
  FOR DELETE
  USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );
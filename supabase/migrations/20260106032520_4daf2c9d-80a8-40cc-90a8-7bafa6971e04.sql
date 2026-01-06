-- Create reports table for content moderation
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'thread', 'message', 'user')),
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policies for reports
CREATE POLICY "Users can create reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Moderators can view all reports"
ON public.reports FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can update reports"
ON public.reports FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- Add foreign keys
ALTER TABLE public.reports 
ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES profiles(id),
ADD CONSTRAINT reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES profiles(id);

-- Enable realtime for reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
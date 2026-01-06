-- Create audio-messages storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-messages', 'audio-messages', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for audio-messages bucket
CREATE POLICY "Anyone can view audio messages"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-messages');

CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-messages');

CREATE POLICY "Users can delete own audio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audio-messages' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create meetings table for video conferencing
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  room_id TEXT NOT NULL UNIQUE,
  scheduled_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view meetings"
ON public.meetings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create meetings"
ON public.meetings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update meetings"
ON public.meetings FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete meetings"
ON public.meetings FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Enable realtime for meetings
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
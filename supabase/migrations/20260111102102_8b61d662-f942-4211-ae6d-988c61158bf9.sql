-- Add document_url column to posts table
ALTER TABLE public.posts ADD COLUMN document_url TEXT;

-- Add document_url column to chat_room_messages table
ALTER TABLE public.chat_room_messages ADD COLUMN document_url TEXT;

-- Add document_url column to messages (DMs) table
ALTER TABLE public.messages ADD COLUMN document_url TEXT;

-- Create documents storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

-- Storage policy: Anyone can view documents
CREATE POLICY "Anyone can view documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Storage policy: Authenticated users can upload documents  
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

-- Storage policy: Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
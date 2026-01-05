-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Create storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add status column to profiles for accountability
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add task_id to strikes for tracking which task caused the strike
ALTER TABLE strikes ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id);

-- Create function to auto-remove members after 3 strikes
CREATE OR REPLACE FUNCTION handle_strike_limit()
RETURNS TRIGGER AS $$
DECLARE
  strike_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO strike_count 
  FROM strikes 
  WHERE user_id = NEW.user_id;
  
  IF strike_count >= 3 THEN
    UPDATE profiles SET status = 'removed' WHERE id = NEW.user_id;
    
    PERFORM create_notification(
      NEW.user_id, 
      'account_warning', 
      'Account Status Changed', 
      'Your account has been flagged due to 3 consecutive missed task deadlines. Please contact a moderator.',
      '/profile'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for strike limit
DROP TRIGGER IF EXISTS on_strike_limit ON strikes;
CREATE TRIGGER on_strike_limit
  AFTER INSERT ON strikes
  FOR EACH ROW EXECUTE FUNCTION handle_strike_limit();
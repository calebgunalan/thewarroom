-- Fix search_path for update_thread_activity function
CREATE OR REPLACE FUNCTION public.update_thread_activity()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.threads 
  SET last_activity = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;
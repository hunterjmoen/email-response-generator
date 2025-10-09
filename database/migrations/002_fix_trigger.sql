-- Fix the user creation trigger
-- Run this in Supabase SQL Editor to fix the trigger issue

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Only create subscription, don't create user record since we handle that in app
  INSERT INTO public.subscriptions (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Make sure RLS policies are correct
DROP POLICY IF EXISTS "Users can only access their own data" ON users;
DROP POLICY IF EXISTS "Users can only access their own subscription" ON subscriptions;

-- Recreate RLS policies with better handling
CREATE POLICY "Users can only access their own data" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only access their own subscription" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);
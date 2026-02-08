-- Add clerk_id column to users table for Clerk integration
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON public.users(clerk_id);

-- Ensure the users table allows reads for authenticated and anon users (for profile lookup)
-- Drop existing select policies if any to avoid conflicts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view their own profile') THEN
    DROP POLICY "Users can view their own profile" ON public.users;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow profile read by clerk_id') THEN
    DROP POLICY "Allow profile read by clerk_id" ON public.users;
  END IF;
END
$$;

-- Allow anyone to read user profiles (needed since Clerk sessions don't have Supabase auth)
CREATE POLICY "Allow profile read by anyone"
ON public.users
FOR SELECT
USING (true);
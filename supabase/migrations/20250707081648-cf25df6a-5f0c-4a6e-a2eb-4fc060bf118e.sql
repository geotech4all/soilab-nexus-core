-- Drop existing policies that might conflict with the new ones
DROP POLICY IF EXISTS "Users can view company members" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Create policy for users to read their own record
CREATE POLICY "Users can read their own record" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

-- Create policy for users to update their own record  
CREATE POLICY "Users can update their own record"
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);
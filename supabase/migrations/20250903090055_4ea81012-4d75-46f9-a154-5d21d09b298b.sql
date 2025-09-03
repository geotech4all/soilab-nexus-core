-- Create a demo user for testing
-- First, let's ensure we have a company for the demo user
INSERT INTO public.companies (name, contact_email, created_at)
VALUES ('Demo Company', 'dipupojeremiah@gmail.com', now())
ON CONFLICT (contact_email) DO NOTHING;

-- Insert the demo user into our users table
-- (The auth user should already exist based on the user's mention)
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  company_id,
  created_at
)
SELECT 
  auth_user.id,
  'dipupojeremiah@gmail.com',
  'Demo User',
  'user'::user_role,
  companies.id,
  now()
FROM auth.users AS auth_user
CROSS JOIN public.companies
WHERE auth_user.email = 'dipupojeremiah@gmail.com'
  AND companies.contact_email = 'dipupojeremiah@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_id = EXCLUDED.company_id;
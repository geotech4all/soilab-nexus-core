-- Drop existing policies that might conflict with the new ones
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Company users can view their company" ON public.companies;

-- Create policy for admins to access all companies (all operations)
CREATE POLICY "Admins can access all companies"
ON public.companies 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id = auth.uid() AND users.role = 'admin'
));

-- Create policy for company users to read their own company
CREATE POLICY "Company users can read their company"
ON public.companies 
FOR SELECT
USING (id = (
  SELECT company_id FROM public.users 
  WHERE users.id = auth.uid()
));
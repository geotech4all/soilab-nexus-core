-- Drop existing policies that might conflict with the new ones
DROP POLICY IF EXISTS "Company members can manage their projects" ON public.projects;

-- Create policy for users to read their company projects
CREATE POLICY "Users can read their company projects"
ON public.projects 
FOR SELECT
USING (
  company_id = (SELECT company_id FROM public.users WHERE users.id = auth.uid())
);

-- Create policy for users to insert/update/delete their company projects
CREATE POLICY "Users can insert/update/delete their company projects"
ON public.projects 
FOR ALL
USING (
  company_id = (SELECT company_id FROM public.users WHERE users.id = auth.uid())
);
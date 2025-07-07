-- Drop existing policies that might conflict with the new ones
DROP POLICY IF EXISTS "Project members can manage boreholes" ON public.boreholes;
DROP POLICY IF EXISTS "Project members can manage tests" ON public.tests;
DROP POLICY IF EXISTS "Project members can manage test results" ON public.test_results;

-- Create policy for users to manage boreholes linked to their company projects
CREATE POLICY "Users can manage boreholes linked to their company"
ON public.boreholes 
FOR ALL
USING (
  project_id IN (
    SELECT id FROM public.projects
    WHERE company_id = (SELECT company_id FROM public.users WHERE users.id = auth.uid())
  )
);

-- Create policy for users to manage tests for their company projects
CREATE POLICY "Users can manage tests for their company projects"
ON public.tests 
FOR ALL
USING (
  project_id IN (
    SELECT id FROM public.projects
    WHERE company_id = (SELECT company_id FROM public.users WHERE users.id = auth.uid())
  )
);

-- Create policy for users to manage test results for their company
CREATE POLICY "Users can manage test results for their company"
ON public.test_results 
FOR ALL
USING (
  test_id IN (
    SELECT id FROM public.tests
    WHERE project_id IN (
      SELECT id FROM public.projects
      WHERE company_id = (SELECT company_id FROM public.users WHERE users.id = auth.uid())
    )
  )
);
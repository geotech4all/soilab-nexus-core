-- Drop existing policies that might conflict with the new ones
DROP POLICY IF EXISTS "Project members can manage files" ON public.files;
DROP POLICY IF EXISTS "Project members can manage locations" ON public.project_locations;

-- Create policy for users to access only their own uploaded files
CREATE POLICY "Users can access their own uploads"
ON public.files 
FOR ALL
USING (uploaded_by = auth.uid());

-- Create policy for users to access project locations for their company
CREATE POLICY "Users can access project locations for their company"
ON public.project_locations 
FOR ALL
USING (
  project_id IN (
    SELECT id FROM public.projects
    WHERE company_id = (SELECT company_id FROM public.users WHERE users.id = auth.uid())
  )
);
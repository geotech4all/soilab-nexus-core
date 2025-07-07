-- Create project_locations table for map visualization
CREATE TABLE public.project_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  geom GEOMETRY(Point, 4326),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.project_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policy for project_locations (project-based access)
CREATE POLICY "Project members can manage locations" ON public.project_locations
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.users u ON p.company_id = u.company_id
      WHERE u.id = auth.uid()
    )
  );

-- Create spatial index for better performance
CREATE INDEX idx_project_locations_project_id ON public.project_locations(project_id);
CREATE INDEX idx_project_locations_geom ON public.project_locations USING GIST(geom);
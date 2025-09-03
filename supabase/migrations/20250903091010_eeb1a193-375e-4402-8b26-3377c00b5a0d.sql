-- Create table for storing map configurations and captured images
CREATE TABLE public.map_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (section_type IN ('layout_map', 'location_map')),
  map_config JSONB NOT NULL DEFAULT '{}',
  captured_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, section_type)
);

-- Enable RLS
ALTER TABLE public.map_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view map configurations for their company projects" 
ON public.map_configurations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    JOIN public.profiles pr ON p.company_id = pr.company_id 
    WHERE p.id = project_id AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create map configurations for their company projects" 
ON public.map_configurations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p 
    JOIN public.profiles pr ON p.company_id = pr.company_id 
    WHERE p.id = project_id AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update map configurations for their company projects" 
ON public.map_configurations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    JOIN public.profiles pr ON p.company_id = pr.company_id 
    WHERE p.id = project_id AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete map configurations for their company projects" 
ON public.map_configurations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    JOIN public.profiles pr ON p.company_id = pr.company_id 
    WHERE p.id = project_id AND pr.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_map_configurations_updated_at
BEFORE UPDATE ON public.map_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
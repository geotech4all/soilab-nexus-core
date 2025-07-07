-- Create companies table first (referenced by users and projects)
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  address TEXT,
  contact_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create users table (references companies)
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'company', 'user')),
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table (references companies and users)
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create files table (needed for tests table reference)
CREATE TABLE public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create boreholes table
CREATE TABLE public.boreholes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  depth NUMERIC,
  coordinates GEOMETRY(Point, 4326),
  stratigraphy JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tests table
CREATE TABLE public.tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  borehole_id UUID REFERENCES public.boreholes(id),
  test_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete')),
  input_method TEXT CHECK (input_method IN ('manual', 'upload', 'paste')),
  uploaded_file_id UUID REFERENCES public.files(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test_results table
CREATE TABLE public.test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
  raw_data JSONB,
  computed_data JSONB,
  standards_used TEXT,
  visual_refs JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boreholes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies (admin can manage all, company users can view their own)
CREATE POLICY "Admins can manage all companies" ON public.companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Company users can view their company" ON public.companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- RLS Policies for users (admin can manage all, users can view company members)
CREATE POLICY "Admins can manage all users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view company members" ON public.users
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- RLS Policies for projects (company-based access)
CREATE POLICY "Company members can manage their projects" ON public.projects
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- RLS Policies for files (project-based access)
CREATE POLICY "Project members can manage files" ON public.files
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.users u ON p.company_id = u.company_id
      WHERE u.id = auth.uid()
    )
  );

-- RLS Policies for boreholes (project-based access)
CREATE POLICY "Project members can manage boreholes" ON public.boreholes
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.users u ON p.company_id = u.company_id
      WHERE u.id = auth.uid()
    )
  );

-- RLS Policies for tests (project-based access)
CREATE POLICY "Project members can manage tests" ON public.tests
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.users u ON p.company_id = u.company_id
      WHERE u.id = auth.uid()
    )
  );

-- RLS Policies for test_results (project-based access through tests)
CREATE POLICY "Project members can manage test results" ON public.test_results
  FOR ALL USING (
    test_id IN (
      SELECT t.id FROM public.tests t
      JOIN public.projects p ON t.project_id = p.id
      JOIN public.users u ON p.company_id = u.company_id
      WHERE u.id = auth.uid()
    )
  );

-- Enable PostGIS extension for geometry support
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create indexes for better performance
CREATE INDEX idx_users_company_id ON public.users(company_id);
CREATE INDEX idx_projects_company_id ON public.projects(company_id);
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_files_project_id ON public.files(project_id);
CREATE INDEX idx_boreholes_project_id ON public.boreholes(project_id);
CREATE INDEX idx_boreholes_coordinates ON public.boreholes USING GIST(coordinates);
CREATE INDEX idx_tests_project_id ON public.tests(project_id);
CREATE INDEX idx_tests_borehole_id ON public.tests(borehole_id);
CREATE INDEX idx_test_results_test_id ON public.test_results(test_id);
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Calendar, FileText, Users } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  company_id: string;
  user_id: string;
}

const ProjectDetail = () => {
  const { userProfile, loading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);

  useEffect(() => {
    if (userProfile && id) {
      fetchProject();
    }
  }, [userProfile, id]);

  const fetchProject = async () => {
    try {
      setLoadingProject(true);
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('company_id', userProfile?.company_id)
        .single();

      if (error) throw error;
      setProject(data);

    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project data',
        variant: 'destructive'
      });
      navigate('/dashboard');
    } finally {
      setLoadingProject(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !userProfile) {
    return <Navigate to="/login" replace />;
  }

  if (loadingProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Project not found</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="hover-scale"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">Project Details</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Project Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
                <CardDescription>
                  Details about this soil testing project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-muted-foreground">
                    {project.description || 'No description provided'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </h4>
                    <p className="text-muted-foreground">
                      {project.location || 'No location specified'}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Created
                    </h4>
                    <p className="text-muted-foreground">
                      {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {project.latitude && project.longitude && (
                  <div>
                    <h4 className="font-medium mb-1">Coordinates</h4>
                    <p className="text-muted-foreground">
                      {project.latitude.toFixed(6)}, {project.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-sm text-muted-foreground">Boreholes</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-sm text-muted-foreground">Tests</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-sm text-muted-foreground">Reports</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Project Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer hover-scale">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-primary" />
                Boreholes
              </CardTitle>
              <CardDescription>
                Manage borehole locations and data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Manage Boreholes</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer hover-scale">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Tests
              </CardTitle>
              <CardDescription>
                View and manage soil tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">View Tests</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer hover-scale">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Reports
              </CardTitle>
              <CardDescription>
                Generate and download reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">View Reports</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer hover-scale">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Team
              </CardTitle>
              <CardDescription>
                Manage project team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Manage Team</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ProjectDetail;
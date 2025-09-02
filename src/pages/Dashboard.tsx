import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, FileText, BarChart3, MapPin, Calendar, Plus } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  borehole_count: number;
  test_count: number;
}

interface DashboardMetrics {
  totalProjects: number;
  totalTests: number;
  totalBoreholes: number;
}

const Dashboard = () => {
  const { userProfile, signOut, loading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProjects: 0,
    totalTests: 0,
    totalBoreholes: 0
  });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (userProfile && isAuthenticated) {
      fetchData();
    }
  }, [userProfile, isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      
      // Fetch user's projects with counts
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          boreholes:boreholes(count),
          tests:tests(count)
        `)
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      const projectsWithCounts = projectsData?.map(project => ({
        ...project,
        borehole_count: project.boreholes?.[0]?.count || 0,
        test_count: project.tests?.[0]?.count || 0
      })) || [];

      setProjects(projectsWithCounts);

      // Calculate metrics
      const totalProjects = projectsWithCounts.length;
      const totalBoreholes = projectsWithCounts.reduce((sum, p) => sum + p.borehole_count, 0);
      const totalTests = projectsWithCounts.reduce((sum, p) => sum + p.test_count, 0);

      setMetrics({
        totalProjects,
        totalBoreholes,
        totalTests
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateProject = () => {
    navigate('/create-project');
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}`);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">SoilLab</h1>
              <p className="text-sm text-muted-foreground">Personal Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{userProfile.full_name}</p>
              <Badge variant="secondary" className="text-xs">
                <User className="h-3 w-3 mr-1" />
                User
              </Badge>
            </div>
            <Button onClick={handleSignOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome, {userProfile.full_name}</h2>
          <p className="text-muted-foreground">Manage your soil testing projects and access results.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Projects</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalProjects}</div>
              <p className="text-xs text-muted-foreground">Active projects</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Boreholes</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalBoreholes}</div>
              <p className="text-xs text-muted-foreground">Across all projects</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tests Completed</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalTests}</div>
              <p className="text-xs text-muted-foreground">Soil tests</p>
            </CardContent>
          </Card>
        </div>

        {/* Projects Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold">My Projects</h3>
            <Button onClick={handleCreateProject} className="hover-scale">
              <Plus className="h-4 w-4 mr-2" />
              Create New Project
            </Button>
          </div>

          {loadingData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first soil testing project to get started
                </p>
                <Button onClick={handleCreateProject}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card 
                  key={project.id} 
                  className="hover:shadow-lg transition-all duration-200 cursor-pointer hover-scale"
                  onClick={() => handleProjectClick(project.id)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg mb-1">{project.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {project.location || 'No location specified'}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(project.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      
                      <div className="flex justify-between items-center pt-2">
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{project.borehole_count} boreholes</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span>{project.test_count} tests</span>
                          </div>
                        </div>
                        
                        {project.latitude && project.longitude && (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <MapPin className="h-6 w-6 text-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Create Button (Mobile) */}
      <Button
        onClick={handleCreateProject}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg md:hidden hover-scale"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default Dashboard;
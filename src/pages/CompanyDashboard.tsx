import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, Users, FolderOpen, FileText, BarChart3, Settings, Plus, Edit, Trash2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  created_at: string;
  test_count: number;
}

interface CompanyUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

interface TestTypeData {
  test_type: string;
  count: number;
}

interface CompanyMetrics {
  totalProjects: number;
  totalTests: number;
  teamMembers: number;
  reportsGenerated: number;
}

const CompanyDashboard = () => {
  const { userProfile, signOut, loading, isCompanyUser, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [testTypeData, setTestTypeData] = useState<TestTypeData[]>([]);
  const [metrics, setMetrics] = useState<CompanyMetrics>({
    totalProjects: 0,
    totalTests: 0,
    teamMembers: 0,
    reportsGenerated: 0
  });
  
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    location: ''
  });

  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    role: 'user'
  });
  
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (userProfile && (isCompanyUser() || isAdmin())) {
      fetchData();
    }
  }, [userProfile, isCompanyUser, isAdmin]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      
      // Fetch company projects with test counts
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          tests:tests(count)
        `)
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      const projectsWithCounts = projectsData?.map(project => ({
        ...project,
        test_count: project.tests?.[0]?.count || 0
      })) || [];

      setProjects(projectsWithCounts);

      // Fetch company users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setCompanyUsers(usersData || []);

      // Fetch test type data for the company
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('test_type, projects!inner(company_id)')
        .eq('projects.company_id', userProfile?.company_id);

      if (testError) throw testError;

      // Aggregate test types
      const testTypeCounts = testData?.reduce((acc, test) => {
        acc[test.test_type] = (acc[test.test_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const testTypeArray = Object.entries(testTypeCounts).map(([test_type, count]) => ({
        test_type,
        count
      }));

      setTestTypeData(testTypeArray);

      // Calculate metrics
      const totalTests = testData?.length || 0;
      const reportsGenerated = Math.floor(totalTests * 0.8); // Assuming 80% of tests generate reports

      setMetrics({
        totalProjects: projectsData?.length || 0,
        totalTests,
        teamMembers: usersData?.length || 0,
        reportsGenerated
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

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const projectData = {
        ...projectForm,
        company_id: userProfile?.company_id,
        user_id: userProfile?.id
      };

      if (editingProject) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editingProject.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Project updated successfully'
        });
      } else {
        // Create new project
        const { error } = await supabase
          .from('projects')
          .insert([projectData]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Project created successfully'
        });
      }

      setIsCreateProjectOpen(false);
      setEditingProject(null);
      setProjectForm({ name: '', description: '', location: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: 'Error',
        description: 'Failed to save project',
        variant: 'destructive'
      });
    }
  };

  const handleUserInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // In a real implementation, this would send an invitation
      // For now, we'll show a success message
      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${userForm.email}`,
      });

      setIsAddUserOpen(false);
      setUserForm({ email: '', full_name: '', role: 'user' });
    } catch (error) {
      console.error('Error inviting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive'
      });
    }
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      description: project.description || '',
      location: project.location || ''
    });
    setIsCreateProjectOpen(true);
  };

  const resetProjectForm = () => {
    setEditingProject(null);
    setProjectForm({ name: '', description: '', location: '' });
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

  if (!userProfile || (!isCompanyUser() && !isAdmin())) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">SoilLab Company</h1>
              <p className="text-sm text-muted-foreground">Company Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{userProfile.full_name}</p>
              <Badge variant="default" className="text-xs">
                <Building className="h-3 w-3 mr-1" />
                Company
              </Badge>
            </div>
            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {userProfile.full_name}</h2>
          <p className="text-muted-foreground">Manage your soil testing projects and team.</p>
        </div>

        {/* Company Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalProjects}</div>
              <p className="text-xs text-muted-foreground">Your projects</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.teamMembers}</div>
              <p className="text-xs text-muted-foreground">Company users</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Tests</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalTests}</div>
              <p className="text-xs text-muted-foreground">Soil tests run</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.reportsGenerated}</div>
              <p className="text-xs text-muted-foreground">Test reports</p>
            </CardContent>
          </Card>
        </div>

        {/* Test Types Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test Types Overview</CardTitle>
            <CardDescription>Distribution of soil tests by type</CardDescription>
          </CardHeader>
          <CardContent>
            {testTypeData.length > 0 ? (
              <div className="space-y-4">
                {testTypeData.map((item) => (
                  <div key={item.test_type} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.test_type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ 
                            width: `${(item.count / Math.max(...testTypeData.map(t => t.count))) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No test data available</p>
            )}
          </CardContent>
        </Card>

        {/* Data Tables */}
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="team">Team Management</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Company Projects</h3>
              <Dialog open={isCreateProjectOpen} onOpenChange={(open) => {
                setIsCreateProjectOpen(open);
                if (!open) resetProjectForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingProject ? 'Edit Project' : 'Create New Project'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingProject ? 'Update project information' : 'Add a new soil testing project'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleProjectSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Project Name</Label>
                      <Input
                        id="name"
                        value={projectForm.name}
                        onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={projectForm.description}
                        onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={projectForm.location}
                        onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateProjectOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingProject ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Tests</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingData ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          Loading projects...
                        </TableCell>
                      </TableRow>
                    ) : projects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No projects found. Create your first project!
                        </TableCell>
                      </TableRow>
                    ) : (
                      projects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell>{project.location || 'N/A'}</TableCell>
                          <TableCell>{project.test_count}</TableCell>
                          <TableCell>{new Date(project.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditProject(project)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Team Members</h3>
              <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Invite User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join your company
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUserInvite} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={userForm.full_name}
                        onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="company">Company Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        Send Invitation
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingData ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          Loading team members...
                        </TableCell>
                      </TableRow>
                    ) : companyUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No team members found. Invite your first team member!
                        </TableCell>
                      </TableRow>
                    ) : (
                      companyUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={user.role === 'company' ? 'default' : 'secondary'}
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={user.id === userProfile?.id}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CompanyDashboard;
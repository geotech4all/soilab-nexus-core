import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MapPin, Calendar, FileText, Plus, Building, Download, Eye, Edit3, Lock } from 'lucide-react';
import { Navigate, useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Map from '@/components/Map';

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
  companies?: { name: string };
}

interface Borehole {
  id: string;
  name: string;
  depth: number | null;
  coordinates: any;
  created_at: string;
}

interface Test {
  id: string;
  test_type: string;
  status: string;
  input_method: string | null;
  created_at: string;
  boreholes?: { name: string } | null;
}

interface Report {
  id: string;
  name: string;
  type: 'PDF' | 'CSV';
  created_at: string;
  file_size?: string;
}

const ProjectDetail = () => {
  const { userProfile, loading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [boreholes, setBoreholes] = useState<Borehole[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [reports] = useState<Report[]>([
    {
      id: '1',
      name: 'Soil Analysis Report - Q1 2024',
      type: 'PDF',
      created_at: new Date().toISOString(),
      file_size: '2.5 MB'
    },
    {
      id: '2',
      name: 'Test Data Export',
      type: 'CSV', 
      created_at: new Date().toISOString(),
      file_size: '1.2 MB'
    }
  ]);
  
  const [loadingProject, setLoadingProject] = useState(true);
  const [isAddBoreholeOpen, setIsAddBoreholeOpen] = useState(false);
  const [isAddTestOpen, setIsAddTestOpen] = useState(false);
  
  const [boreholeForm, setBoreholeForm] = useState({
    name: '',
    depth: '',
    latitude: '',
    longitude: ''
  });

  const [testForm, setTestForm] = useState({
    test_type: '',
    input_method: '',
    borehole_id: '',
    description: ''
  });

  const testTypes = [
    'Soil Classification',
    'Compaction Test',
    'Permeability Test',
    'Shear Strength',
    'Chemical Analysis',
    'Contamination Screen'
  ];

  const inputMethods = [
    'Manual Entry',
    'Lab Results Upload', 
    'Field Data Logger',
    'Third-party Import'
  ];

  useEffect(() => {
    if (userProfile && id) {
      fetchProjectData();
    }
  }, [userProfile, id]);

  const fetchProjectData = async () => {
    try {
      setLoadingProject(true);
      
      // Fetch project with company info
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          companies:company_id(name)
        `)
        .eq('id', id)
        .eq('company_id', userProfile?.company_id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch boreholes for this project
      const { data: boreholesData, error: boreholesError } = await supabase
        .from('boreholes')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (boreholesError) throw boreholesError;
      setBoreholes(boreholesData || []);

      // Fetch tests for this project
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select(`
          *,
          boreholes:borehole_id(name)
        `)
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (testsError) throw testsError;
      setTests(testsData || []);

    } catch (error) {
      console.error('Error fetching project data:', error);
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

  const handleAddBorehole = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const boreholeData = {
        name: boreholeForm.name,
        depth: boreholeForm.depth ? parseFloat(boreholeForm.depth) : null,
        project_id: id,
        coordinates: boreholeForm.latitude && boreholeForm.longitude 
          ? `POINT(${boreholeForm.longitude} ${boreholeForm.latitude})`
          : null
      };

      const { error } = await supabase
        .from('boreholes')
        .insert([boreholeData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Borehole added successfully'
      });

      setIsAddBoreholeOpen(false);
      setBoreholeForm({ name: '', depth: '', latitude: '', longitude: '' });
      fetchProjectData(); // Refresh data

    } catch (error) {
      console.error('Error adding borehole:', error);
      toast({
        title: 'Error',
        description: 'Failed to add borehole',
        variant: 'destructive'
      });
    }
  };

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const testData = {
        test_type: testForm.test_type,
        input_method: testForm.input_method || null,
        borehole_id: testForm.borehole_id || null,
        project_id: id,
        status: 'pending'
      };

      const { error } = await supabase
        .from('tests')
        .insert([testData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Test added successfully'
      });

      setIsAddTestOpen(false);
      setTestForm({ test_type: '', input_method: '', borehole_id: '', description: '' });
      fetchProjectData(); // Refresh data

    } catch (error) {
      console.error('Error adding test:', error);
      toast({
        title: 'Error',
        description: 'Failed to add test',
        variant: 'destructive'
      });
    }
  };

  const handleGenerateReport = () => {
    toast({
      title: 'Report Generation Started',
      description: 'Your report is being generated and will be available shortly'
    });
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">Project Management</p>
          </div>
        </div>
      </header>

      {/* Project Header Information */}
      <div className="container mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl mb-2">{project.name}</CardTitle>
                <CardDescription className="text-base">
                  {project.description || 'No description provided'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">
                  <Building className="h-3 w-3 mr-1" />
                  {project.companies?.name || 'Unknown Company'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">
                    {project.location || 'No location specified'}
                  </p>
                </div>
              </div>

              {project.latitude && project.longitude && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Coordinates</p>
                    <p className="text-sm text-muted-foreground">
                      {project.latitude.toFixed(4)}, {project.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <Tabs defaultValue="boreholes" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="boreholes">Boreholes</TabsTrigger>
              <TabsTrigger value="tests">Tests</TabsTrigger>
              <TabsTrigger value="foundation">Foundation</TabsTrigger>
              <TabsTrigger value="map">Map View</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

          {/* Boreholes Tab */}
          <TabsContent value="boreholes" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Project Boreholes</h3>
              <Dialog open={isAddBoreholeOpen} onOpenChange={setIsAddBoreholeOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Borehole
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Borehole</DialogTitle>
                    <DialogDescription>
                      Create a new borehole for this project
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddBorehole} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="borehole-name">Borehole Name</Label>
                      <Input
                        id="borehole-name"
                        value={boreholeForm.name}
                        onChange={(e) => setBoreholeForm({ ...boreholeForm, name: e.target.value })}
                        placeholder="e.g., BH-001"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depth">Depth (meters)</Label>
                      <Input
                        id="depth"
                        type="number"
                        step="0.1"
                        value={boreholeForm.depth}
                        onChange={(e) => setBoreholeForm({ ...boreholeForm, depth: e.target.value })}
                        placeholder="10.5"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bh-latitude">Latitude</Label>
                        <Input
                          id="bh-latitude"
                          type="number"
                          step="any"
                          value={boreholeForm.latitude}
                          onChange={(e) => setBoreholeForm({ ...boreholeForm, latitude: e.target.value })}
                          placeholder="40.7128"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bh-longitude">Longitude</Label>
                        <Input
                          id="bh-longitude"
                          type="number"
                          step="any"
                          value={boreholeForm.longitude}
                          onChange={(e) => setBoreholeForm({ ...boreholeForm, longitude: e.target.value })}
                          placeholder="-74.0060"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsAddBoreholeOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Add Borehole</Button>
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
                      <TableHead>Depth (m)</TableHead>
                      <TableHead>Coordinates</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boreholes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="text-muted-foreground">
                            <MapPin className="h-8 w-8 mx-auto mb-2" />
                            <p>No boreholes found for this project</p>
                            <p className="text-sm">Add your first borehole to get started</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      boreholes.map((borehole) => (
                        <TableRow key={borehole.id}>
                          <TableCell className="font-medium">{borehole.name}</TableCell>
                          <TableCell>{borehole.depth ? `${borehole.depth}m` : 'N/A'}</TableCell>
                          <TableCell>
                            {borehole.coordinates ? 'Available' : 'Not set'}
                          </TableCell>
                          <TableCell>{new Date(borehole.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
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

          {/* Tests Tab */}
          <TabsContent value="tests" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Soil Tests</h3>
              <Dialog open={isAddTestOpen} onOpenChange={setIsAddTestOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Test
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Test</DialogTitle>
                    <DialogDescription>
                      Create a new soil test for this project
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddTest} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="test-type">Test Type</Label>
                      <Select value={testForm.test_type} onValueChange={(value) => setTestForm({ ...testForm, test_type: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select test type" />
                        </SelectTrigger>
                        <SelectContent>
                          {testTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="input-method">Input Method</Label>
                      <Select value={testForm.input_method} onValueChange={(value) => setTestForm({ ...testForm, input_method: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select input method" />
                        </SelectTrigger>
                        <SelectContent>
                          {inputMethods.map((method) => (
                            <SelectItem key={method} value={method}>{method}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="borehole">Linked Borehole (Optional)</Label>
                      <Select value={testForm.borehole_id} onValueChange={(value) => setTestForm({ ...testForm, borehole_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select borehole" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No borehole</SelectItem>
                          {boreholes.map((borehole) => (
                            <SelectItem key={borehole.id} value={borehole.id}>{borehole.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsAddTestOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Add Test</Button>
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
                      <TableHead>Test Type</TableHead>
                      <TableHead>Linked Borehole</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Input Method</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2" />
                            <p>No tests found for this project</p>
                            <p className="text-sm">Add your first test to get started</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      tests.map((test) => (
                        <TableRow key={test.id}>
                          <TableCell className="font-medium">{test.test_type}</TableCell>
                          <TableCell>{test.boreholes?.name || 'Not linked'}</TableCell>
                          <TableCell>
                            <Badge variant={test.status === 'completed' ? 'default' : 'secondary'}>
                              {test.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{test.input_method || 'N/A'}</TableCell>
                          <TableCell>{new Date(test.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
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

          {/* Foundation Tab */}
          <TabsContent value="foundation" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Foundation Analysis</h3>
              <Button onClick={() => navigate(`/foundation/${id}`)}>
                <Plus className="h-4 w-4 mr-2" />
                New Analysis
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Foundation Design & Analysis</CardTitle>
                <CardDescription>
                  Perform shallow and deep foundation analysis using project data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Foundation Analysis Tool</p>
                  <p className="text-muted-foreground mb-4">
                    Analyze bearing capacity, settlement, and pile capacity using project boreholes and test data
                  </p>
                  <Button onClick={() => navigate(`/foundation/${id}`)}>
                    Start Foundation Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Map View Tab */}
          <TabsContent value="map" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Project Location</h3>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Interactive Map</CardTitle>
                <CardDescription>
                  View the project location and associated boreholes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {project.latitude && project.longitude ? (
                  <Map
                    latitude={project.latitude}
                    longitude={project.longitude}
                  />
                ) : (
                  <div className="h-96 flex items-center justify-center bg-muted rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-4" />
                      <p>No location coordinates available</p>
                      <p className="text-sm">Set project coordinates to view map</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Project Reports</h3>
              <Button onClick={handleGenerateReport}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>

            {/* Report Builder Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Report Builder
                </CardTitle>
                <CardDescription>
                  Generate comprehensive geotechnical reports with your project data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <Edit3 className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <h4 className="font-medium">Edit Mode</h4>
                      <p className="text-sm text-muted-foreground">Full editing capabilities</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <Eye className="w-8 h-8 mx-auto mb-2 text-secondary" />
                      <h4 className="font-medium">Review Mode</h4>
                      <p className="text-sm text-muted-foreground">Comments and text edits</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <Lock className="w-8 h-8 mx-auto mb-2 text-destructive" />
                      <h4 className="font-medium">Final Mode</h4>
                      <p className="text-sm text-muted-foreground">Export ready</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button asChild className="flex-1">
                      <Link to={`/report/${project.id}`}>
                        <FileText className="w-4 h-4 mr-2" />
                        Open Report Builder
                      </Link>
                    </Button>
                    <Button variant="outline" disabled>
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Existing Reports */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report) => (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{report.name}</CardTitle>
                        <CardDescription>
                          {report.type} • {report.file_size}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">{report.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {reports.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="text-center py-8">
                    <div className="text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2" />
                      <p>No reports generated yet</p>
                      <p className="text-sm">Generate your first report to get started</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectDetail;
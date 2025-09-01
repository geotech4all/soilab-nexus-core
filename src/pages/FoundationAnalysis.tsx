import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Building2, Calculator, FileText, Save, AlertTriangle } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LayerPicker } from '@/components/foundation/LayerPicker';
import { FoundationInputs } from '@/components/foundation/FoundationInputs';
import { FoundationResults } from '@/components/foundation/FoundationResults';

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  companies?: { name: string };
}

interface Borehole {
  id: string;
  name: string;
  depth: number | null;
  stratigraphy: any;
}

interface Test {
  id: string;
  test_type: string;
  status: string;
  borehole_id: string | null;
}

interface TestResult {
  id: string;
  test_id: string;
  computed_data: any;
  raw_data: any;
}

interface FoundationParams {
  foundationType: 'shallow' | 'deep';
  subType: string;
  designStandard: string;
  factorOfSafety: number;
  groundwaterLevel: number | null;
  unitWeight: number;
  cohesion: number;
  frictionAngle: number;
  footingWidth: number | null;
  embedmentDepth: number | null;
  pileLength: number | null;
  pileDiameter: number | null;
  selectedLayers: any[];
}

const FoundationAnalysis = () => {
  const { userProfile, loading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [boreholes, setBoreholes] = useState<Borehole[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [computing, setComputing] = useState(false);
  const [results, setResults] = useState<any>(null);
  
  const [params, setParams] = useState<FoundationParams>({
    foundationType: 'shallow',
    subType: 'strip',
    designStandard: 'eurocode7',
    factorOfSafety: 2.5,
    groundwaterLevel: null,
    unitWeight: 18.0,
    cohesion: 0,
    frictionAngle: 30,
    footingWidth: 2.0,
    embedmentDepth: 1.0,
    pileLength: null,
    pileDiameter: null,
    selectedLayers: []
  });

  useEffect(() => {
    if (userProfile && projectId) {
      fetchProjectData();
    }
  }, [userProfile, projectId]);

  const fetchProjectData = async () => {
    try {
      setLoadingData(true);
      
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*, companies:company_id(name)')
        .eq('id', projectId)
        .eq('company_id', userProfile?.company_id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch boreholes
      const { data: boreholesData, error: boreholesError } = await supabase
        .from('boreholes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (boreholesError) throw boreholesError;
      setBoreholes(boreholesData || []);

      // Fetch tests
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('project_id', projectId)
        .in('test_type', ['SPT', 'CPT', 'Atterberg', 'Consolidation', 'PSD', 'Compaction'])
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (testsError) throw testsError;
      setTests(testsData || []);

      // Fetch test results
      if (testsData && testsData.length > 0) {
        const { data: resultsData, error: resultsError } = await supabase
          .from('test_results')
          .select('*')
          .in('test_id', testsData.map(t => t.id));

        if (resultsError) throw resultsError;
        setTestResults(resultsData || []);
      }

    } catch (error) {
      console.error('Error fetching project data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project data',
        variant: 'destructive'
      });
      navigate('/dashboard');
    } finally {
      setLoadingData(false);
    }
  };

  const handleCompute = async () => {
    try {
      setComputing(true);
      
      const endpoint = params.foundationType === 'shallow' 
        ? 'compute-foundation-shallow'
        : 'compute-foundation-pile';

      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: {
          project_id: projectId,
          parameters: params,
          test_data: testResults
        }
      });

      if (error) throw error;
      
      setResults(data);
      toast({
        title: 'Success',
        description: 'Foundation analysis completed'
      });

    } catch (error) {
      console.error('Error computing foundation:', error);
      toast({
        title: 'Error',
        description: 'Failed to compute foundation analysis',
        variant: 'destructive'
      });
    } finally {
      setComputing(false);
    }
  };

  const handleSaveToReport = async () => {
    if (!results) return;

    try {
      const reportData = {
        project_id: projectId,
        analysis_type: 'foundation',
        parameters: params,
        results: results,
        created_at: new Date().toISOString()
      };

      // Save snapshot to test_results.visual_refs for report builder
      const { error } = await supabase
        .from('test_results')
        .insert({
          computed_data: results as any,
          visual_refs: { report_data: reportData } as any,
          standards_used: params.designStandard
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Foundation analysis saved to report'
      });

    } catch (error) {
      console.error('Error saving to report:', error);
      toast({
        title: 'Error',
        description: 'Failed to save analysis to report',
        variant: 'destructive'
      });
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

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Loading project data...</p>
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
            onClick={() => navigate(`/project/${projectId}`)}
            className="hover-scale"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Foundation Analysis</h1>
            <p className="text-sm text-muted-foreground">{project.name}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">
              <Building2 className="h-3 w-3 mr-1" />
              {project.companies?.name || 'Unknown Company'}
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Analysis Parameters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FoundationInputs 
                  params={params} 
                  setParams={setParams}
                  tests={tests}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Layer Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <LayerPicker 
                  boreholes={boreholes}
                  selectedLayers={params.selectedLayers}
                  onLayersChange={(layers) => setParams({ ...params, selectedLayers: layers })}
                />
              </CardContent>
            </Card>
          </div>

          {/* Control Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleCompute}
                  disabled={computing}
                  className="w-full"
                  size="lg"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {computing ? 'Computing...' : 'Run Analysis'}
                </Button>

                {results && (
                  <Button 
                    onClick={handleSaveToReport}
                    variant="outline"
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Add to Report
                  </Button>
                )}

                <div className="text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Ensure all parameters are validated before analysis
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Available Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Boreholes:</span>
                  <Badge variant="secondary">{boreholes.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Tests:</span>
                  <Badge variant="secondary">{tests.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Results:</span>
                  <Badge variant="secondary">{testResults.length}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FoundationResults results={results} params={params} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FoundationAnalysis;
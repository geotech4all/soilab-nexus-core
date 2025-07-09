import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, FileText, Grid, Download, Calculator } from 'lucide-react';

interface Test {
  id: string;
  test_type: string;
  status: string;
  project_id: string;
  borehole_id: string | null;
  input_method: string | null;
}

interface TestResult {
  id: string;
  raw_data: any;
  computed_data: any;
  visual_refs: any;
  standards_used: string | null;
}

interface Borehole {
  id: string;
  name: string;
}

const TestInput = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [test, setTest] = useState<Test | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [boreholes, setBoreholes] = useState<Borehole[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [inputMode, setInputMode] = useState<'manual' | 'paste' | 'upload'>('manual');
  
  // Manual input states
  const [manualData, setManualData] = useState<Record<string, any>>({});
  
  // Paste/Grid input states
  const [gridData, setGridData] = useState<string>('');
  const [parsedGridData, setParsedGridData] = useState<any[]>([]);
  
  // Upload states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedData, setUploadedData] = useState<any[]>([]);

  useEffect(() => {
    fetchTestData();
  }, [testId]);

  const fetchTestData = async () => {
    try {
      // Fetch test details
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;
      setTest(testData);

      // Fetch test results if any
      const { data: resultData, error: resultError } = await supabase
        .from('test_results')
        .select('*')
        .eq('test_id', testId)
        .maybeSingle();

      if (!resultError && resultData) {
        setTestResult(resultData);
      }

      // Fetch available boreholes for the project
      const { data: boreholesData, error: boreholesError } = await supabase
        .from('boreholes')
        .select('id, name')
        .eq('project_id', testData.project_id);

      if (!boreholesError) {
        setBoreholes(boreholesData || []);
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualInputChange = (field: string, value: any) => {
    setManualData(prev => ({ ...prev, [field]: value }));
  };

  const parseGridData = () => {
    try {
      const lines = gridData.trim().split('\n');
      const parsed = lines.map(line => {
        const values = line.split('\t').map(val => val.trim());
        return values;
      });
      setParsedGridData(parsed);
      toast({
        title: "Success",
        description: "Data parsed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse pasted data",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    
    // Simple CSV parsing for demonstration
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const parsed = lines.map(line => line.split(',').map(val => val.trim()));
      setUploadedData(parsed);
    } else {
      toast({
        title: "File Format",
        description: "Please upload a CSV file for now. XLSX support coming soon.",
        variant: "destructive",
      });
    }
  };

  const submitTestData = async () => {
    if (!test) return;

    let rawData: any = {};
    
    switch (inputMode) {
      case 'manual':
        rawData = manualData;
        break;
      case 'paste':
        rawData = { gridData: parsedGridData };
        break;
      case 'upload':
        rawData = { uploadedData, fileName: uploadedFile?.name };
        break;
    }

    setCalculating(true);
    
    try {
      // Call edge function to calculate results
      const { data: computedData, error: computeError } = await supabase.functions.invoke(
        'calculate-geotechnical-parameters',
        {
          body: {
            testType: test.test_type,
            rawData,
            testId: test.id
          }
        }
      );

      if (computeError) throw computeError;

      // Save or update test results
      const resultData = {
        test_id: test.id,
        raw_data: rawData,
        computed_data: computedData,
        visual_refs: computedData.charts || null,
        standards_used: computedData.standards || null
      };

      let resultError;
      if (testResult) {
        const { error } = await supabase
          .from('test_results')
          .update(resultData)
          .eq('id', testResult.id);
        resultError = error;
      } else {
        const { error } = await supabase
          .from('test_results')
          .insert(resultData);
        resultError = error;
      }

      if (resultError) throw resultError;

      // Update test status
      await supabase
        .from('tests')
        .update({ 
          status: 'completed',
          input_method: inputMode 
        })
        .eq('id', test.id);

      toast({
        title: "Success",
        description: "Test data processed and results calculated",
      });

      // Refresh data
      fetchTestData();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  const exportResults = (format: 'csv' | 'pdf') => {
    // Implementation for export functionality
    toast({
      title: "Export",
      description: `${format.toUpperCase()} export functionality coming soon`,
    });
  };

  const renderManualInputForm = () => {
    const formFields = getFormFieldsForTestType(test?.test_type || '');
    
    return (
      <div className="space-y-4">
        {formFields.map((field) => (
          <div key={field.name} className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <Input
              type={field.type}
              placeholder={field.placeholder}
              value={manualData[field.name] || ''}
              onChange={(e) => handleManualInputChange(field.name, e.target.value)}
            />
          </div>
        ))}
      </div>
    );
  };

  const getFormFieldsForTestType = (testType: string) => {
    // Common fields based on test type
    const commonFields = [
      { name: 'depth', label: 'Depth (m)', type: 'number', placeholder: '0.0' },
      { name: 'sample_id', label: 'Sample ID', type: 'text', placeholder: 'S1-1' }
    ];

    switch (testType.toLowerCase()) {
      case 'spt':
        return [
          ...commonFields,
          { name: 'n_value', label: 'N Value', type: 'number', placeholder: '15' },
          { name: 'blow_count_1', label: 'First 15cm Blows', type: 'number', placeholder: '5' },
          { name: 'blow_count_2', label: 'Second 15cm Blows', type: 'number', placeholder: '7' },
          { name: 'blow_count_3', label: 'Third 15cm Blows', type: 'number', placeholder: '8' }
        ];
      case 'atterberg':
        return [
          ...commonFields,
          { name: 'liquid_limit', label: 'Liquid Limit (%)', type: 'number', placeholder: '25' },
          { name: 'plastic_limit', label: 'Plastic Limit (%)', type: 'number', placeholder: '15' },
          { name: 'plasticity_index', label: 'Plasticity Index (%)', type: 'number', placeholder: '10' }
        ];
      case 'grain_size':
        return [
          ...commonFields,
          { name: 'gravel_percent', label: 'Gravel (%)', type: 'number', placeholder: '5' },
          { name: 'sand_percent', label: 'Sand (%)', type: 'number', placeholder: '65' },
          { name: 'fines_percent', label: 'Fines (%)', type: 'number', placeholder: '30' }
        ];
      default:
        return commonFields;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Test not found</h1>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const selectedBorehole = boreholes.find(b => b.id === test.borehole_id);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(`/project/${test.project_id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {test.test_type.toUpperCase()} Test
              <Badge variant={test.status === 'completed' ? 'default' : 'secondary'}>
                {test.status}
              </Badge>
            </h1>
            <p className="text-muted-foreground">
              {selectedBorehole ? `Linked to: ${selectedBorehole.name}` : 'No borehole linked'}
            </p>
          </div>
        </div>
        
        {testResult && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportResults('csv')}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => exportResults('pdf')}>
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Test Data Input</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={inputMode} onValueChange={(value) => setInputMode(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="manual">
                  <Grid className="h-4 w-4 mr-2" />
                  Manual
                </TabsTrigger>
                <TabsTrigger value="paste">
                  <FileText className="h-4 w-4 mr-2" />
                  Paste
                </TabsTrigger>
                <TabsTrigger value="upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4 mt-4">
                {renderManualInputForm()}
              </TabsContent>

              <TabsContent value="paste" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Paste Excel Data (Tab-separated)</label>
                  <Textarea
                    placeholder="Paste your data here... (Tab-separated values)"
                    value={gridData}
                    onChange={(e) => setGridData(e.target.value)}
                    rows={8}
                  />
                  <Button onClick={parseGridData} variant="outline" size="sm">
                    Parse Data
                  </Button>
                </div>
                
                {parsedGridData.length > 0 && (
                  <div className="border rounded-lg p-4 max-h-48 overflow-auto">
                    <h4 className="font-medium mb-2">Parsed Data Preview:</h4>
                    <Table>
                      <TableBody>
                        {parsedGridData.slice(0, 5).map((row, i) => (
                          <TableRow key={i}>
                            {row.map((cell, j) => (
                              <TableCell key={j} className="text-sm">{cell}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="upload" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload CSV/XLSX File</label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                
                {uploadedData.length > 0 && (
                  <div className="border rounded-lg p-4 max-h-48 overflow-auto">
                    <h4 className="font-medium mb-2">File Data Preview:</h4>
                    <Table>
                      <TableBody>
                        {uploadedData.slice(0, 5).map((row, i) => (
                          <TableRow key={i}>
                            {row.map((cell, j) => (
                              <TableCell key={j} className="text-sm">{cell}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-4 border-t">
              <Button 
                onClick={submitTestData} 
                disabled={calculating}
                className="w-full"
              >
                <Calculator className="h-4 w-4 mr-2" />
                {calculating ? "Processing..." : "Calculate Results"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {testResult ? (
              <div className="space-y-4">
                {/* Raw Data Table */}
                <div>
                  <h4 className="font-medium mb-2">Raw Data</h4>
                  <div className="border rounded-lg p-3 bg-muted/50 max-h-32 overflow-auto">
                    <pre className="text-xs">{JSON.stringify(testResult.raw_data, null, 2)}</pre>
                  </div>
                </div>

                {/* Computed Results */}
                <div>
                  <h4 className="font-medium mb-2">Computed Parameters</h4>
                  <div className="border rounded-lg p-3 bg-muted/50 max-h-32 overflow-auto">
                    <pre className="text-xs">{JSON.stringify(testResult.computed_data, null, 2)}</pre>
                  </div>
                </div>

                {/* Chart Placeholder */}
                <div>
                  <h4 className="font-medium mb-2">Visualization</h4>
                  <div className="border rounded-lg p-8 bg-muted/50 text-center">
                    <p className="text-muted-foreground">Chart visualization coming soon</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Will include grain size curves, CPT plots, etc.
                    </p>
                  </div>
                </div>

                {testResult.standards_used && (
                  <div>
                    <h4 className="font-medium mb-2">Standards Used</h4>
                    <Badge variant="outline">{testResult.standards_used}</Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No results yet</p>
                <p className="text-sm">Submit test data to see calculated results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestInput;
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, FileText, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { ReportMode } from "@/pages/ReportBuilder";

interface FoundationSummaryProps {
  mode: ReportMode;
  testResults: any[];
  content: {
    engineerNotes?: string;
    showAssumptions?: boolean;
    selectedFoundationAnalysis?: string;
  };
  onContentUpdate: (content: any) => void;
}

export const FoundationSummary = ({ mode, testResults, content, onContentUpdate }: FoundationSummaryProps) => {
  const [showAssumptions, setShowAssumptions] = useState(content.showAssumptions || false);
  const [showDetails, setShowDetails] = useState(false);

  // Find foundation analysis results
  const foundationResults = testResults.filter(result => 
    result.tests?.test_type === 'Foundation Analysis' && 
    result.computed_data
  );

  const selectedResult = foundationResults.find(r => 
    r.id === content.selectedFoundationAnalysis
  ) || foundationResults[0];

  const results = selectedResult?.computed_data;
  const params = selectedResult?.raw_data;

  const handleNotesChange = (notes: string) => {
    onContentUpdate({ engineerNotes: notes });
  };

  const handleAssumptionsToggle = (show: boolean) => {
    setShowAssumptions(show);
    onContentUpdate({ showAssumptions: show });
  };

  const handleAnalysisSelect = (analysisId: string) => {
    onContentUpdate({ selectedFoundationAnalysis: analysisId });
  };

  if (!results) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Foundation Analysis Available</h3>
          <p className="text-muted-foreground">
            Foundation analysis results will appear here once completed.
          </p>
          {mode === "edit" && (
            <Button variant="outline" className="mt-4">
              <FileText className="h-4 w-4 mr-2" />
              Run Foundation Analysis
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold print:text-xl">Foundation Analysis Summary</h2>
        {mode === "edit" && foundationResults.length > 1 && (
          <select 
            value={content.selectedFoundationAnalysis || ''}
            onChange={(e) => handleAnalysisSelect(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background"
          >
            <option value="">Select Analysis</option>
            {foundationResults.map(result => (
              <option key={result.id} value={result.id}>
                {result.raw_data?.foundationType} - {new Date(result.created_at).toLocaleDateString()}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Foundation Type</div>
              <div className="text-lg font-semibold capitalize">
                {params?.foundationType || 'Not specified'} Foundation
              </div>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Allowable Load</div>
              <div className="text-lg font-semibold">
                {results.allowable_load?.toFixed(0) || 'N/A'} kN
              </div>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Governing Settlement</div>
              <div className="text-lg font-semibold">
                {results.total_settlement?.toFixed(1) || 'N/A'} mm
              </div>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Factor of Safety</div>
              <div className="text-lg font-semibold">
                {params?.factorOfSafety || 'N/A'}
              </div>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Controlling Limit State:</strong> {results.controlling_limit_state || 'Settlement'}
              {results.critical_layer && (
                <>
                  <br />
                  <strong>Critical Soil Layer:</strong> {results.critical_layer}
                </>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Key Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Key Design Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Method/Standard</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Ultimate Capacity</TableCell>
                <TableCell className="font-semibold">{results.ultimate_capacity?.toFixed(0) || 'N/A'}</TableCell>
                <TableCell>kN</TableCell>
                <TableCell>{results.method_used || params?.designStandard}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Allowable Bearing Pressure</TableCell>
                <TableCell className="font-semibold">{results.allowable_pressure?.toFixed(0) || 'N/A'}</TableCell>
                <TableCell>kPa</TableCell>
                <TableCell>Ultimate / FS</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Total Settlement</TableCell>
                <TableCell className="font-semibold">{results.total_settlement?.toFixed(1) || 'N/A'}</TableCell>
                <TableCell>mm</TableCell>
                <TableCell>Elastic + Consolidation</TableCell>
              </TableRow>
              {results.immediate_settlement && (
                <TableRow>
                  <TableCell className="pl-6">• Immediate Settlement</TableCell>
                  <TableCell>{results.immediate_settlement.toFixed(1)}</TableCell>
                  <TableCell>mm</TableCell>
                  <TableCell>Elastic theory</TableCell>
                </TableRow>
              )}
              {results.consolidation_settlement && (
                <TableRow>
                  <TableCell className="pl-6">• Consolidation Settlement</TableCell>
                  <TableCell>{results.consolidation_settlement.toFixed(1)}</TableCell>
                  <TableCell>mm</TableCell>
                  <TableCell>Terzaghi theory</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Load-Settlement Chart */}
      {results.chart_data?.load_settlement && (
        <Card>
          <CardHeader>
            <CardTitle>Load-Settlement Curve</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={results.chart_data.load_settlement}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.3)" />
                <XAxis 
                  dataKey="load" 
                  stroke="hsl(var(--foreground))"
                  label={{ value: 'Applied Load (kN)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  stroke="hsl(var(--foreground))"
                  label={{ value: 'Settlement (mm)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="settlement" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Engineer's Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Engineer's Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mode === "edit" ? (
            <Textarea
              value={content.engineerNotes || ''}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add engineering observations, design considerations, and recommendations..."
              className="min-h-[120px]"
            />
          ) : (
            <div className="prose prose-sm max-w-none">
              {content.engineerNotes ? (
                <p className="whitespace-pre-wrap">{content.engineerNotes}</p>
              ) : (
                <p className="text-muted-foreground italic">No engineering notes provided.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {results.recommendations && results.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Design Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {results.recommendations.map((rec: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Assumptions and Limitations Toggle */}
      {mode === "edit" && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-assumptions"
              checked={showAssumptions}
              onCheckedChange={handleAssumptionsToggle}
            />
            <Label htmlFor="show-assumptions" className="text-sm font-medium">
              Include assumptions and limitations in report
            </Label>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs"
          >
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Preview
          </Button>
        </div>
      )}

      {/* Assumptions and Limitations (conditionally shown) */}
      {(showAssumptions || showDetails) && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Assumptions and Limitations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Analysis Methodology</h4>
              <p className="text-sm text-muted-foreground">
                {params?.foundationType === 'shallow' 
                  ? `Shallow foundation analysis performed using ${results.method_used || 'Terzaghi'} method according to ${params?.designStandard?.toUpperCase() || 'standard'} guidelines.`
                  : `Deep foundation analysis using ${results.method_used || 'combined α-β methods'} for pile capacity estimation according to ${params?.designStandard?.toUpperCase() || 'standard'} guidelines.`
                }
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Key Assumptions</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Soil properties are representative of actual field conditions</li>
                <li>Static loading conditions assumed throughout analysis</li>
                <li>No significant construction effects on soil properties</li>
                {params?.groundwaterLevel && (
                  <li>Groundwater level assumed at {params.groundwaterLevel}m below ground surface</li>
                )}
                <li>Factor of safety of {params?.factorOfSafety || 'standard'} applied to ultimate capacity</li>
                <li>Foundation dimensions as specified in design parameters</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Limitations</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Analysis based on available site investigation data and correlations</li>
                <li>Local geological variations may affect actual performance</li>
                <li>Dynamic and cyclic loading effects not considered</li>
                <li>Long-term monitoring recommended to verify predicted settlements</li>
                <li>Construction sequence and temporary loading not evaluated</li>
              </ul>
            </div>

            {results.warnings && results.warnings.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Analysis Warnings:</strong>
                  <ul className="mt-2 list-disc list-inside">
                    {results.warnings.map((warning: string, idx: number) => (
                      <li key={idx} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
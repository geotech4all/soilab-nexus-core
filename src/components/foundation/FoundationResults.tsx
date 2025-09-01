import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle, FileText, BarChart3 } from 'lucide-react';

interface FoundationResultsProps {
  results: any;
  params: any;
}

export const FoundationResults = ({ results, params }: FoundationResultsProps) => {
  const [activeTab, setActiveTab] = useState('summary');

  if (!results) return null;

  const renderSummaryTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ultimate Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {results.ultimate_capacity?.toFixed(1) || 'N/A'} kN
            </div>
            <p className="text-xs text-muted-foreground">
              {params.foundationType === 'shallow' ? 'Bearing capacity' : 'Pile capacity'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Allowable Load</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {results.allowable_load?.toFixed(1) || 'N/A'} kN
            </div>
            <p className="text-xs text-muted-foreground">
              With FS = {params.factorOfSafety}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Settlement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {results.total_settlement?.toFixed(1) || 'N/A'} mm
            </div>
            <p className="text-xs text-muted-foreground">
              Total estimated settlement
            </p>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Controlling Limit State:</strong> {results.controlling_limit_state || 'Not determined'}
          <br />
          <strong>Critical Layer:</strong> {results.critical_layer || 'Multiple layers considered'}
        </AlertDescription>
      </Alert>

      {results.warnings && results.warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warnings:</strong>
            <ul className="mt-2 list-disc list-inside">
              {results.warnings.map((warning: string, idx: number) => (
                <li key={idx} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Design Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {results.recommendations?.map((rec: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
                <p className="text-sm">{rec}</p>
              </div>
            )) || (
              <p className="text-muted-foreground">No specific recommendations available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTablesTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Capacity Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Ultimate Bearing Capacity</TableCell>
                <TableCell>{results.ultimate_capacity?.toFixed(1) || 'N/A'}</TableCell>
                <TableCell>kN</TableCell>
                <TableCell>{results.method_used || 'Standard'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Allowable Bearing Pressure</TableCell>
                <TableCell>{results.allowable_pressure?.toFixed(1) || 'N/A'}</TableCell>
                <TableCell>kPa</TableCell>
                <TableCell>Ultimate / FS</TableCell>
              </TableRow>
              {params.foundationType === 'shallow' && (
                <>
                  <TableRow>
                    <TableCell>Immediate Settlement</TableCell>
                    <TableCell>{results.immediate_settlement?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>mm</TableCell>
                    <TableCell>Elastic theory</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Consolidation Settlement</TableCell>
                    <TableCell>{results.consolidation_settlement?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>mm</TableCell>
                    <TableCell>Oedometer data</TableCell>
                  </TableRow>
                </>
              )}
              {params.foundationType === 'deep' && (
                <>
                  <TableRow>
                    <TableCell>Shaft Capacity</TableCell>
                    <TableCell>{results.shaft_capacity?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>kN</TableCell>
                    <TableCell>α-method</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Base Capacity</TableCell>
                    <TableCell>{results.base_capacity?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>kN</TableCell>
                    <TableCell>CPT correlation</TableCell>
                  </TableRow>
                  {params.subType === 'pile_group' && (
                    <TableRow>
                      <TableCell>Group Efficiency</TableCell>
                      <TableCell>{results.group_efficiency?.toFixed(2) || 'N/A'}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>Simplified method</TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {results.layer_analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Layer-by-Layer Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Depth (m)</TableHead>
                  <TableHead>Soil Type</TableHead>
                  <TableHead>Contribution</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.layer_analysis.map((layer: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{layer.from_depth} - {layer.to_depth}</TableCell>
                    <TableCell>{layer.soil_type}</TableCell>
                    <TableCell>{layer.contribution?.toFixed(1)} kN</TableCell>
                    <TableCell>
                      <Badge variant={layer.is_critical ? 'destructive' : 'secondary'}>
                        {layer.is_critical ? 'Critical' : 'Normal'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderChartsTab = () => (
    <div className="space-y-6">
      {/* Capacity vs Depth Chart */}
      {results.chart_data?.capacity_depth && (
        <Card>
          <CardHeader>
            <CardTitle>Capacity vs Depth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={results.chart_data.capacity_depth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="depth" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="capacity" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Load-Settlement Curve */}
      {results.chart_data?.load_settlement && (
        <Card>
          <CardHeader>
            <CardTitle>Load-Settlement Curve</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={results.chart_data.load_settlement}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="load" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="settlement" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Bearing Capacity Components */}
      {results.chart_data?.capacity_components && (
        <Card>
          <CardHeader>
            <CardTitle>Bearing Capacity Components</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={results.chart_data.capacity_components}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="component" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderNotesTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analysis Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Methodology</h4>
            <p className="text-sm text-muted-foreground">
              {params.foundationType === 'shallow' 
                ? `Shallow foundation analysis performed using ${results.method_used || 'Terzaghi'} method according to ${params.designStandard?.toUpperCase()} standards.`
                : `Deep foundation analysis using ${results.method_used || 'combined α-β methods'} for pile capacity estimation.`
              }
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Assumptions</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Homogeneous soil properties within each defined layer</li>
              <li>Static loading conditions considered</li>
              <li>No significant construction effects on soil properties</li>
              {params.groundwaterLevel && (
                <li>Groundwater level at {params.groundwaterLevel}m below ground level</li>
              )}
              <li>Factor of safety of {params.factorOfSafety} applied to ultimate capacity</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Limitations</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Analysis based on available test data and assumed parameters</li>
              <li>Local geological conditions may affect actual performance</li>
              <li>Dynamic loading effects not considered</li>
              <li>Long-term settlement monitoring recommended</li>
            </ul>
          </div>

          {results.calculation_details && (
            <div>
              <h4 className="font-semibold mb-2">Calculation Details</h4>
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                {JSON.stringify(results.calculation_details, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="summary" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Summary
        </TabsTrigger>
        <TabsTrigger value="tables" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Tables
        </TabsTrigger>
        <TabsTrigger value="charts" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Charts
        </TabsTrigger>
        <TabsTrigger value="notes" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Notes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="summary" className="mt-6">
        {renderSummaryTab()}
      </TabsContent>

      <TabsContent value="tables" className="mt-6">
        {renderTablesTab()}
      </TabsContent>

      <TabsContent value="charts" className="mt-6">
        {renderChartsTab()}
      </TabsContent>

      <TabsContent value="notes" className="mt-6">
        {renderNotesTab()}
      </TabsContent>
    </Tabs>
  );
};
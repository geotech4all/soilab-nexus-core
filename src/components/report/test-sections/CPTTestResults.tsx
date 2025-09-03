import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import { Button } from "@/components/ui/button";
import { Download, Edit3, Image } from "lucide-react";
import type { ReportMode } from "@/pages/ReportBuilder";

interface CPTTestResultsProps {
  testResult: any;
  mode: ReportMode;
  onCaptionUpdate?: (field: string, value: string) => void;
}

export function CPTTestResults({ testResult, mode, onCaptionUpdate }: CPTTestResultsProps) {
  const isEditable = mode !== "final";
  const rawData = testResult.raw_data || {};
  const computedData = testResult.computed_data || {};
  
  const cptData = rawData.data || [];
  const summary = computedData.summary || {};
  const chartData = computedData.chartData || [];

  const handleCaptionChange = (field: string, value: string) => {
    if (onCaptionUpdate && isEditable) {
      onCaptionUpdate(field, value);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Paragraph */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cone Penetration Test (CPT) Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cone Penetration Tests were performed to determine soil behavior types, bearing capacity, 
              and settlement characteristics. The tests provide continuous profiles of cone resistance (qc), 
              sleeve friction (fs), and pore pressure (u2).
            </p>
            
            {summary.interpretation && (
              <div className="bg-muted/20 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Test Interpretation</h4>
                <p className="text-sm">{summary.interpretation}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CPT Summary Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">CPT Summary Results</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">Table 2</Badge>
            <Button size="sm" variant="ghost">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Depth (m)</TableHead>
                  <TableHead>qc (MPa)</TableHead>
                  <TableHead>fs (MPa)</TableHead>
                  <TableHead>Rf (%)</TableHead>
                  <TableHead>qt (MPa)</TableHead>
                  <TableHead>Ic</TableHead>
                  <TableHead>Soil Behavior Type</TableHead>
                  <TableHead>φ' (°)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cptData.slice(0, 10).map((row: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{row.depth}</TableCell>
                    <TableCell>{row.qc}</TableCell>
                    <TableCell>{row.fs}</TableCell>
                    <TableCell>{row.frictionRatio}</TableCell>
                    <TableCell>{row.qt}</TableCell>
                    <TableCell>{row.soilBehaviorIndex}</TableCell>
                    <TableCell>{row.soilBehaviorType}</TableCell>
                    <TableCell>{row.frictionAngle}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Table Caption */}
            <div className="mt-2">
              {isEditable ? (
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Table 2 caption..."
                    defaultValue={testResult.content?.tableCaption2 || "CPT test results showing cone resistance, friction, and derived parameters"}
                    onChange={(e) => handleCaptionChange("tableCaption2", e.target.value)}
                    className="text-sm border-none p-0 h-auto focus-visible:ring-0"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {testResult.content?.tableCaption2 || "CPT test results showing cone resistance, friction, and derived parameters"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CPT Profile Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">CPT Profile with Depth</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">Figure 2</Badge>
            <Button size="sm" variant="ghost">
              <Image className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="qc" type="number" domain={['dataMin', 'dataMax']} />
                  <YAxis dataKey="depth" type="number" domain={['dataMin', 'dataMax']} reversed />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="qc" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Figure Caption */}
            <div className="mt-2">
              {isEditable ? (
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-muted-foreground" />
                  <Textarea
                    placeholder="Figure 2 caption..."
                    defaultValue={testResult.content?.figureCaption2 || "CPT cone resistance (qc) profile showing variation with depth"}
                    onChange={(e) => handleCaptionChange("figureCaption2", e.target.value)}
                    className="text-sm border-none p-0 min-h-[60px] resize-none focus-visible:ring-0"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {testResult.content?.figureCaption2 || "CPT cone resistance (qc) profile showing variation with depth"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Soil Behavior Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Soil Behavior Type Classification</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">Figure 3</Badge>
            <Button size="sm" variant="ghost">
              <Image className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="qt" type="number" scale="log" domain={['dataMin', 'dataMax']} />
                  <YAxis dataKey="frictionRatio" type="number" />
                  <Tooltip />
                  <Scatter dataKey="frictionRatio" fill="hsl(var(--primary))" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            
            {/* Figure Caption */}
            <div className="mt-2">
              {isEditable ? (
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-muted-foreground" />
                  <Textarea
                    placeholder="Figure 3 caption..."
                    defaultValue={testResult.content?.figureCaption3 || "Robertson soil behavior classification chart showing test data points"}
                    onChange={(e) => handleCaptionChange("figureCaption3", e.target.value)}
                    className="text-sm border-none p-0 min-h-[60px] resize-none focus-visible:ring-0"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {testResult.content?.figureCaption3 || "Robertson soil behavior classification chart showing test data points"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Findings */}
      {summary.keyFindings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {summary.keyFindings.map((finding: string, index: number) => (
                <li key={index}>{finding}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
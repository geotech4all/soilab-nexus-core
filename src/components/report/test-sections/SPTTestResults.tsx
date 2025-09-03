import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Download, Edit3, Image } from "lucide-react";
import type { ReportMode } from "@/pages/ReportBuilder";

interface SPTTestResultsProps {
  testResult: any;
  mode: ReportMode;
  onCaptionUpdate?: (field: string, value: string) => void;
}

export function SPTTestResults({ testResult, mode, onCaptionUpdate }: SPTTestResultsProps) {
  const isEditable = mode !== "final";
  const rawData = testResult.raw_data || {};
  const computedData = testResult.computed_data || {};
  
  // Sample SPT data structure
  const sptData = rawData.data || [];
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
          <CardTitle className="text-lg">Standard Penetration Test (SPT) Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Standard Penetration Tests were conducted at various depths to determine soil resistance and classify soil types. 
              The following results present N-values, corrected values (N₆₀), and derived geotechnical parameters.
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

      {/* SPT Results Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">SPT Test Results</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">Table 1</Badge>
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
                  <TableHead>N-Raw</TableHead>
                  <TableHead>N₆₀</TableHead>
                  <TableHead>N₁₆₀</TableHead>
                  <TableHead>Soil Classification</TableHead>
                  <TableHead>Relative Density (%)</TableHead>
                  <TableHead>Friction Angle (°)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sptData.map((row: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{row.depth}</TableCell>
                    <TableCell>{row.nRaw}</TableCell>
                    <TableCell>{row.n60}</TableCell>
                    <TableCell>{row.n1_60}</TableCell>
                    <TableCell>{row.soilClassification}</TableCell>
                    <TableCell>{row.relativeDensity}</TableCell>
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
                    placeholder="Table 1 caption..."
                    defaultValue={testResult.content?.tableCaption || "Standard Penetration Test results showing N-values and derived parameters"}
                    onChange={(e) => handleCaptionChange("tableCaption", e.target.value)}
                    className="text-sm border-none p-0 h-auto focus-visible:ring-0"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {testResult.content?.tableCaption || "Standard Penetration Test results showing N-values and derived parameters"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SPT Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">N-Value vs Depth Profile</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">Figure 1</Badge>
            <Button size="sm" variant="ghost">
              <Image className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="depth" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="n60" fill="hsl(var(--primary))" />
                  <Bar dataKey="n1_60" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Figure Caption */}
            <div className="mt-2">
              {isEditable ? (
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-muted-foreground" />
                  <Textarea
                    placeholder="Figure 1 caption..."
                    defaultValue={testResult.content?.figureCaption || "SPT N-value profile showing corrected N₆₀ and N₁₆₀ values with depth"}
                    onChange={(e) => handleCaptionChange("figureCaption", e.target.value)}
                    className="text-sm border-none p-0 min-h-[60px] resize-none focus-visible:ring-0"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {testResult.content?.figureCaption || "SPT N-value profile showing corrected N₆₀ and N₁₆₀ values with depth"}
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
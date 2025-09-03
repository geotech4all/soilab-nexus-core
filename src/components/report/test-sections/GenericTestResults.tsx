import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Download, Edit3, Image } from "lucide-react";
import type { ReportMode } from "@/pages/ReportBuilder";

interface GenericTestResultsProps {
  testResult: any;
  mode: ReportMode;
  testType: string;
  onCaptionUpdate?: (field: string, value: string) => void;
}

const testTypeDescriptions: Record<string, string> = {
  "atterberg": "Atterberg Limits tests were conducted to determine the liquid limit, plastic limit, and plasticity index of fine-grained soils.",
  "psd": "Particle Size Distribution analysis was performed using sieving and hydrometer methods to classify soil gradation.",
  "compaction": "Standard Proctor compaction tests were conducted to determine optimum moisture content and maximum dry density.",
  "cbr": "California Bearing Ratio tests were performed to evaluate the strength characteristics of subgrade materials.",
  "consolidation": "One-dimensional consolidation tests were conducted to determine settlement characteristics and consolidation parameters.",
  "shear": "Direct shear or triaxial tests were performed to determine shear strength parameters including cohesion and friction angle."
};

const testTypeTitles: Record<string, string> = {
  "atterberg": "Atterberg Limits Test Results",
  "psd": "Particle Size Distribution Analysis",
  "compaction": "Compaction Test Results", 
  "cbr": "California Bearing Ratio Test Results",
  "consolidation": "Consolidation Test Results",
  "shear": "Shear Strength Test Results"
};

export function GenericTestResults({ testResult, mode, testType, onCaptionUpdate }: GenericTestResultsProps) {
  const isEditable = mode !== "final";
  const rawData = testResult.raw_data || {};
  const computedData = testResult.computed_data || {};
  const visualRefs = testResult.visual_refs || {};
  
  const data = rawData.data || [];
  const summary = computedData.summary || {};
  const chartData = computedData.chartData || [];

  const handleCaptionChange = (field: string, value: string) => {
    if (onCaptionUpdate && isEditable) {
      onCaptionUpdate(field, value);
    }
  };

  const getTableHeaders = () => {
    switch (testType.toLowerCase()) {
      case "atterberg":
        return ["Sample ID", "Liquid Limit (%)", "Plastic Limit (%)", "Plasticity Index", "Classification"];
      case "psd":
        return ["Sieve Size (mm)", "% Passing", "% Retained", "Cumulative % Retained"];
      case "compaction":
        return ["Water Content (%)", "Dry Density (kg/m³)", "Wet Density (kg/m³)", "Void Ratio"];
      case "cbr":
        return ["Penetration (mm)", "Load (kN)", "Pressure (kPa)", "CBR (%)"];
      case "consolidation":
        return ["Load (kPa)", "Void Ratio", "Settlement (mm)", "Cv (m²/year)"];
      case "shear":
        return ["Normal Stress (kPa)", "Shear Stress (kPa)", "Displacement (mm)", "Peak Strength (kPa)"];
      default:
        return ["Parameter", "Value", "Units", "Notes"];
    }
  };

  const tableNumber = Math.floor(Math.random() * 10) + 3;
  const figureNumber = Math.floor(Math.random() * 10) + 4;

  return (
    <div className="space-y-6">
      {/* Summary Paragraph */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{testTypeTitles[testType] || `${testType.toUpperCase()} Test Results`}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {testTypeDescriptions[testType] || `${testType} tests were conducted to determine relevant geotechnical parameters.`}
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

      {/* Results Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{testTypeTitles[testType] || `${testType.toUpperCase()} Test Data`}</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">Table {tableNumber}</Badge>
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
                  {getTableHeaders().map((header, index) => (
                    <TableHead key={index}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 8).map((row: any, index: number) => (
                  <TableRow key={index}>
                    {getTableHeaders().map((header, cellIndex) => (
                      <TableCell key={cellIndex}>
                        {String(Object.values(row)[cellIndex] || "-")}
                      </TableCell>
                    ))}
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
                    placeholder={`Table ${tableNumber} caption...`}
                    defaultValue={testResult.content?.tableCaption || `${testTypeTitles[testType] || testType} test results and parameters`}
                    onChange={(e) => handleCaptionChange("tableCaption", e.target.value)}
                    className="text-sm border-none p-0 h-auto focus-visible:ring-0"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {testResult.content?.tableCaption || `${testTypeTitles[testType] || testType} test results and parameters`}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
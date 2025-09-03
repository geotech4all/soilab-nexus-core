import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  Search, 
  Table2, 
  FileSpreadsheet, 
  Archive,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";
import JSZip from 'jszip';
import type { ReportSection } from "@/pages/ReportBuilder";

interface TablesManagerProps {
  sections: ReportSection[];
  testResults: any[];
  onSectionUpdate: (sectionId: string, content: any) => void;
}

interface TableInfo {
  id: string;
  sectionId: string;
  sectionTitle: string;
  tableName: string;
  tableNumber: number;
  caption: string;
  visible: boolean;
  data: any[];
  headers: string[];
  testType?: string;
}

export function TablesManager({ sections, testResults, onSectionUpdate }: TablesManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Extract all tables from sections and test results
  const allTables = useMemo((): TableInfo[] => {
    const tables: TableInfo[] = [];
    let tableCounter = 1;

    // Add tables from test sections
    sections.forEach(section => {
      if (section.type === "test_section" && section.enabled) {
        const testResult = testResults.find(tr => tr.id === section.content.testResultId);
        if (testResult && testResult.raw_data?.data) {
          const testType = testResult.tests?.test_type || "unknown";
          
          tables.push({
            id: `${section.id}_main_table`,
            sectionId: section.id,
            sectionTitle: section.title,
            tableName: `${testType.toUpperCase()} Test Results`,
            tableNumber: tableCounter++,
            caption: section.content?.tableCaption || `${testType} test results and parameters`,
            visible: section.content?.tableVisible !== false,
            data: testResult.raw_data.data,
            headers: Object.keys(testResult.raw_data.data[0] || {}),
            testType: testType
          });

          // Add computed data table if available
          if (testResult.computed_data?.summary) {
            tables.push({
              id: `${section.id}_summary_table`,
              sectionId: section.id,
              sectionTitle: section.title,
              tableName: `${testType.toUpperCase()} Summary Parameters`,
              tableNumber: tableCounter++,
              caption: section.content?.summaryCaption || `${testType} derived parameters and summary`,
              visible: section.content?.summaryVisible !== false,
              data: [testResult.computed_data.summary],
              headers: Object.keys(testResult.computed_data.summary),
              testType: testType
            });
          }
        }
      }
    });

    return tables;
  }, [sections, testResults]);

  // Filter tables based on search
  const filteredTables = allTables.filter(table =>
    table.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.sectionTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.testType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTableVisibilityToggle = (tableId: string) => {
    const table = allTables.find(t => t.id === tableId);
    if (!table) return;

    const newVisibility = !table.visible;
    table.visible = newVisibility;

    // Update the section content
    onSectionUpdate(table.sectionId, {
      [`${tableId.includes('summary') ? 'summaryVisible' : 'tableVisible'}`]: newVisibility
    });
  };

  const handleTableSelection = (tableId: string) => {
    setSelectedTables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tableId)) {
        newSet.delete(tableId);
      } else {
        newSet.add(tableId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTables.size === filteredTables.length) {
      setSelectedTables(new Set());
    } else {
      setSelectedTables(new Set(filteredTables.map(t => t.id)));
    }
  };

  const convertToCSV = (data: any[], headers: string[]): string => {
    if (data.length === 0) return "";
    
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(","));
    
    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || "";
        // Escape commas and quotes
        return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
          ? `"${value.replace(/"/g, '""')}"` 
          : String(value);
      });
      csvRows.push(values.join(","));
    });
    
    return csvRows.join("\n");
  };

  const handleExportSelected = async () => {
    if (selectedTables.size === 0) {
      toast.error("Please select tables to export");
      return;
    }

    setIsExporting(true);

    try {
      // Get selected table data
      const selectedTableData = filteredTables.filter(table => 
        selectedTables.has(table.id) && table.visible
      );

      if (selectedTableData.length === 0) {
        toast.error("No visible tables selected for export");
        return;
      }

      // Create ZIP file using JSZip
      const zip = new JSZip();
      
      selectedTableData.forEach(table => {
        const csvContent = convertToCSV(table.data, table.headers);
        const filename = `Table_${table.tableNumber}_${table.tableName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
        zip.file(filename, csvContent);
      });

      // Generate and download ZIP file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "Report_Tables.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${selectedTableData.length} tables as ZIP file`);
      setSelectedTables(new Set());
    } catch (error) {
      toast.error("Failed to export tables");
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = async () => {
    const visibleTables = allTables.filter(t => t.visible);
    if (visibleTables.length === 0) {
      toast.error("No visible tables to export");
      return;
    }

    setIsExporting(true);

    try {
      const zip = new JSZip();
      
      visibleTables.forEach(table => {
        const csvContent = convertToCSV(table.data, table.headers);
        const filename = `Table_${table.tableNumber}_${table.tableName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
        zip.file(filename, csvContent);
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "All_Report_Tables.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported all ${visibleTables.length} visible tables as ZIP file`);
    } catch (error) {
      toast.error("Failed to export tables");
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Table2 className="w-5 h-5" />
              Tables Manager
            </h3>
            <p className="text-sm text-muted-foreground">
              Manage report tables and export to CSV
            </p>
          </div>
          
          <Badge variant="secondary">
            {allTables.length} total tables
          </Badge>
        </div>

        {/* Search and Actions */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button
            variant="outline"
            onClick={handleSelectAll}
            disabled={filteredTables.length === 0}
          >
            {selectedTables.size === filteredTables.length ? "Deselect All" : "Select All"}
          </Button>
        </div>

        {/* Export Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleExportSelected}
            disabled={selectedTables.size === 0 || isExporting}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                Export Selected as ZIP
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleExportAll}
            disabled={isExporting}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export All
          </Button>
        </div>
      </div>

      {/* Tables List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {filteredTables.length === 0 ? (
            <div className="text-center py-8">
              <Table2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchTerm ? "No tables match your search" : "No tables found in the report"}
              </p>
            </div>
          ) : (
            filteredTables.map((table) => (
              <Card key={table.id} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTables.has(table.id)}
                        onChange={() => handleTableSelection(table.id)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{table.tableName}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            Table {table.tableNumber}
                          </Badge>
                          {table.testType && (
                            <Badge variant="secondary" className="text-xs">
                              {table.testType.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          Section: {table.sectionTitle}
                        </p>
                        
                        <p className="text-xs text-muted-foreground italic">
                          {table.caption}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTableVisibilityToggle(table.id)}
                      >
                        {table.visible ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={async () => {
                          try {
                            const csvContent = convertToCSV(table.data, table.headers);
                            const blob = new Blob([csvContent], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Table_${table.tableNumber}_${table.tableName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                            toast.success("Table exported successfully");
                          } catch (error) {
                            toast.error("Failed to export table");
                          }
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{table.data.length} rows × {table.headers.length} columns</span>
                    <span className={`font-medium ${table.visible ? 'text-green-600' : 'text-orange-600'}`}>
                      {table.visible ? 'Visible in report' : 'Hidden from report'}
                    </span>
                  </div>
                  
                  {table.headers.length > 0 && (
                    <div className="mt-2 p-2 bg-muted/20 rounded text-xs">
                      <strong>Columns:</strong> {table.headers.slice(0, 5).join(", ")}
                      {table.headers.length > 5 && ` (+${table.headers.length - 5} more)`}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer Statistics */}
      <div className="p-4 border-t border-border bg-muted/20">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{selectedTables.size} tables selected</span>
          <span>{filteredTables.filter(t => t.visible).length} visible in report</span>
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Image, 
  BarChart, 
  FileText, 
  MapPin,
  Building,
  TestTube,
  Settings
} from "lucide-react";
import type { ReportSection, ReportMode } from "@/pages/ReportBuilder";
import { CoverPage } from "./CoverPage";
import { TableOfContents } from "./TableOfContents";

interface ReportCanvasProps {
  sections: ReportSection[];
  selectedSectionId: string;
  onContentUpdate: (sectionId: string, content: any) => void;
  mode: ReportMode;
  project: any;
  testResults: any[];
  brandColors: { primary: string; secondary: string };
  pageBreakSettings: Record<string, boolean>;
  onPageBreakSettingsChange: (settings: Record<string, boolean>) => void;
}

export function ReportCanvas({
  sections,
  selectedSectionId,
  onContentUpdate,
  mode,
  project,
  testResults,
  brandColors,
  pageBreakSettings,
  onPageBreakSettingsChange
}: ReportCanvasProps) {
  const selectedSection = sections.find(s => s.id === selectedSectionId);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [showPageSettings, setShowPageSettings] = useState(false);

  // Calculate page number for current section
  const getPageNumber = (sectionId: string) => {
    const enabledSections = sections
      .filter(s => s.enabled && s.type !== "cover")
      .sort((a, b) => a.order - b.order);
    
    const sectionIndex = enabledSections.findIndex(s => s.id === sectionId);
    return sectionIndex >= 0 ? sectionIndex + 1 : 1;
  };

  if (!selectedSection) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Select a section to preview</p>
      </div>
    );
  }

  const isEditable = mode !== "final";
  const isStructuralEdit = mode === "edit";

  const handleTextUpdate = (field: string, value: string) => {
    if (!isEditable) return;
    onContentUpdate(selectedSectionId, { [field]: value });
  };

  const handleCommentAdd = (field: string, comment: string) => {
    if (mode !== "review") return;
    setComments(prev => ({ ...prev, [`${selectedSectionId}_${field}`]: comment }));
  };

  const renderSectionContent = () => {
    switch (selectedSection.type) {
      case "cover":
        return (
          <CoverPage
            project={project}
            content={selectedSection.content}
            onContentUpdate={(content) => onContentUpdate(selectedSectionId, content)}
            mode={mode}
            brandColors={brandColors}
          />
        );

      case "table_of_contents":
        return (
          <TableOfContents
            sections={sections}
            brandColors={brandColors}
          />
        );

      case "introduction":
        return (
          <div className="space-y-6">
            <div className="prose max-w-none">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">1. Introduction</h2>
                <span className="text-sm text-muted-foreground">Page {getPageNumber(selectedSectionId)}</span>
              </div>
              <div className="bg-card border rounded-lg p-6">
                {isEditable ? (
                  <Textarea
                    value={selectedSection.content.text || "This report presents the findings of the geotechnical investigation conducted for the proposed development project..."}
                    onChange={(e) => handleTextUpdate("text", e.target.value)}
                    className="min-h-[200px] border-none p-0 resize-none focus-visible:ring-0"
                    placeholder="Enter introduction text..."
                  />
                ) : (
                  <p className="whitespace-pre-wrap">
                    {selectedSection.content.text || "This report presents the findings of the geotechnical investigation conducted for the proposed development project..."}
                  </p>
                )}
              </div>
            </div>
            
            {mode === "review" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Comments</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add review comments..."
                    value={comments[`${selectedSectionId}_text`] || ""}
                    onChange={(e) => handleCommentAdd("text", e.target.value)}
                    className="min-h-[80px]"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "test_holes_summary":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">2. Summary of Test Holes</h2>
              <span className="text-sm text-muted-foreground">Page {getPageNumber(selectedSectionId)}</span>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {project.boreholes?.map((borehole: any, index: number) => (
                    <Card key={borehole.id} className="border-2 border-dashed">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TestTube className="w-4 h-4" />
                          <h4 className="font-medium">{borehole.name}</h4>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Depth: {borehole.depth}m</p>
                          <p>Tests: {borehole.tests?.length || 0}</p>
                          <Badge variant="outline" className="text-xs">
                            BH-{index + 1}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {testResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Available Visual References</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {testResults.map((result) => (
                      <Button
                        key={result.id}
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        disabled={!isStructuralEdit}
                      >
                        <BarChart className="w-4 h-4 mr-2" />
                        {result.tests.test_type} Chart
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "test_section":
        const testResult = testResults.find(r => r.id === selectedSection.content.testResultId);
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{selectedSection.title}</h2>
              <span className="text-sm text-muted-foreground">Page {getPageNumber(selectedSectionId)}</span>
            </div>
            
            {testResult && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Test Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/20 p-4 rounded-lg border-2 border-dashed">
                      <div className="flex items-center justify-center h-32">
                        <div className="text-center">
                          <BarChart className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {testResult.tests.test_type} Results Visualization
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {testResult.visual_refs && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Charts & Figures</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.keys(testResult.visual_refs).map((key) => (
                          <div key={key} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                            <Image className="w-4 h-4" />
                            <span className="text-sm">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <Badge variant="secondary" className="ml-auto text-xs">
                              Available
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        );

      case "location_map":
      case "layout_map":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">
                {selectedSection.type === "location_map" ? "3. Location Map" : "4. Site Layout Map"}
              </h2>
              <span className="text-sm text-muted-foreground">Page {getPageNumber(selectedSectionId)}</span>
            </div>
            
            <div className="bg-muted/20 border-2 border-dashed rounded-lg p-12">
              <div className="text-center">
                <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">
                  {selectedSection.type === "location_map" ? "Project Location" : "Site Layout"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {project.location || "Location coordinates will be displayed here"}
                </p>
                {isStructuralEdit && (
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Insert Map
                  </Button>
                )}
              </div>
            </div>
          </div>
        );

      case "foundation_summary":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Foundation Analysis Summary</h2>
              <span className="text-sm text-muted-foreground">Page {getPageNumber(selectedSectionId)}</span>
            </div>
            
            <div className="bg-muted/20 border-2 border-dashed rounded-lg p-8">
              <div className="text-center">
                <BarChart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Foundation analysis results will be displayed here
                </p>
                {isStructuralEdit && (
                  <Button variant="outline" className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Insert Foundation Analysis
                  </Button>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{selectedSection.title}</h2>
              <span className="text-sm text-muted-foreground">Page {getPageNumber(selectedSectionId)}</span>
            </div>
            <div className="bg-muted/20 border-2 border-dashed rounded-lg p-8">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Section content will be displayed here</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Canvas Header */}
      <div className="border-b border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{selectedSection.title}</h3>
            <p className="text-sm text-muted-foreground">
              {selectedSection.type === "cover" ? "Cover Page" : `Page ${getPageNumber(selectedSectionId)}`} • {selectedSection.enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={selectedSection.enabled ? "default" : "secondary"}>
              {selectedSection.enabled ? "Included" : "Excluded"}
            </Badge>

            {mode === "edit" && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setShowPageSettings(!showPageSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
            
            {mode !== "final" && selectedSection.enabled && (
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Element
              </Button>
            )}
          </div>
        </div>

        {/* Page Settings */}
        {showPageSettings && mode === "edit" && (
          <Card className="m-4 border-t-0 rounded-t-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Page Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="pageBreak" className="text-sm">Start on new page</Label>
                <Switch
                  id="pageBreak"
                  checked={pageBreakSettings[selectedSectionId] ?? true}
                  onCheckedChange={(checked) => 
                    onPageBreakSettingsChange({
                      ...pageBreakSettings,
                      [selectedSectionId]: checked
                    })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, this section will start on a new page in the final report
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Canvas Content */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-lg rounded-lg p-8 min-h-[800px]">
            {selectedSection.enabled ? (
              renderSectionContent()
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>This section is disabled and will not appear in the final report</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
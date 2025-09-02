import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ReportSectionOutline } from "@/components/report/ReportSectionOutline";
import { ReportCanvas } from "@/components/report/ReportCanvas";
import { ReportModeSelector } from "@/components/report/ReportModeSelector";

export type ReportMode = "edit" | "review" | "final";

export interface ReportSection {
  id: string;
  title: string;
  type: "cover" | "introduction" | "layout_map" | "location_map" | "test_holes_summary" | "test_section" | "foundation_summary" | "appendix";
  enabled: boolean;
  content: any;
  order: number;
}

const defaultSections: ReportSection[] = [
  { id: "cover", title: "Cover Page", type: "cover", enabled: true, content: {}, order: 0 },
  { id: "intro", title: "Introduction", type: "introduction", enabled: true, content: { text: "" }, order: 1 },
  { id: "layout", title: "Layout Map", type: "layout_map", enabled: true, content: {}, order: 2 },
  { id: "location", title: "Location Map", type: "location_map", enabled: true, content: {}, order: 3 },
  { id: "test_summary", title: "Summary of Test Holes", type: "test_holes_summary", enabled: true, content: {}, order: 4 },
  { id: "foundation", title: "Foundation Analysis Summary", type: "foundation_summary", enabled: true, content: {}, order: 5 },
  { id: "appendices", title: "Appendices", type: "appendix", enabled: true, content: {}, order: 6 },
];

export default function ReportBuilder() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [mode, setMode] = useState<ReportMode>("edit");
  const [sections, setSections] = useState<ReportSection[]>(defaultSections);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("cover");
  const [reportMetadata, setReportMetadata] = useState({
    fileName: "",
    footerText: "",
    companyLogo: "",
    brandColors: { primary: "", secondary: "" }
  });

  // Fetch project data
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          boreholes (
            *,
            tests (
              *,
              test_results (*)
            )
          )
        `)
        .eq("id", projectId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch test results with visual references
  const { data: testResults, isLoading: resultsLoading } = useQuery({
    queryKey: ["test-results", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_results")
        .select(`
          *,
          tests!inner (
            project_id,
            test_type
          )
        `)
        .eq("tests.project_id", projectId)
        .not("visual_refs", "is", null);
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  useEffect(() => {
    if (project && !reportMetadata.fileName) {
      setReportMetadata(prev => ({
        ...prev,
        fileName: `${project.name}_Geotechnical_Report.pdf`
      }));
    }
  }, [project, reportMetadata.fileName]);

  // Add per-test sections dynamically
  useEffect(() => {
    if (testResults && testResults.length > 0) {
      const testSections: ReportSection[] = testResults.map((result, index) => ({
        id: `test_${result.id}`,
        title: `${result.tests.test_type} Test Results`,
        type: "test_section",
        enabled: true,
        content: { testResultId: result.id, visualRefs: result.visual_refs },
        order: 5 + index // Insert before foundation summary
      }));

      setSections(prev => {
        const existingIds = new Set(prev.map(s => s.id));
        const newSections = testSections.filter(ts => !existingIds.has(ts.id));
        
        if (newSections.length > 0) {
          return [...prev.slice(0, 5), ...newSections, ...prev.slice(5)]
            .map((section, index) => ({ ...section, order: index }));
        }
        return prev;
      });
    }
  }, [testResults]);

  const handleSectionReorder = (draggedId: string, targetId: string) => {
    if (mode !== "edit") return;

    const draggedIndex = sections.findIndex(s => s.id === draggedId);
    const targetIndex = sections.findIndex(s => s.id === targetId);
    
    const newSections = [...sections];
    const [draggedItem] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, draggedItem);
    
    setSections(newSections.map((section, index) => ({ ...section, order: index })));
  };

  const handleSectionToggle = (sectionId: string) => {
    if (mode === "final") return;
    
    setSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, enabled: !section.enabled }
          : section
      )
    );
  };

  const handleContentUpdate = (sectionId: string, content: any) => {
    if (mode === "final") return;
    
    setSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, content: { ...section.content, ...content } }
          : section
      )
    );
  };

  const handleExport = async () => {
    toast.info("PDF export functionality will be implemented in the next step");
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (projectLoading || resultsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading report builder...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Project Not Found</h1>
          <Link to="/dashboard">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to={`/project/${projectId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Project
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Report Builder</h1>
              <p className="text-muted-foreground">{project.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ReportModeSelector mode={mode} onModeChange={setMode} />
            
            {mode === "final" && (
              <Button onClick={handleExport} className="gap-2">
                <FileText className="w-4 h-4" />
                Export PDF
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Section Outline */}
        <div className="w-80 border-r border-border bg-card">
          <ReportSectionOutline
            sections={sections}
            selectedSectionId={selectedSectionId}
            onSectionSelect={setSelectedSectionId}
            onSectionReorder={handleSectionReorder}
            onSectionToggle={handleSectionToggle}
            mode={mode}
            reportMetadata={reportMetadata}
            onMetadataUpdate={setReportMetadata}
          />
        </div>

        {/* Main Canvas */}
        <div className="flex-1 bg-muted/20">
          <ReportCanvas
            sections={sections}
            selectedSectionId={selectedSectionId}
            onContentUpdate={handleContentUpdate}
            mode={mode}
            project={project}
            testResults={testResults || []}
          />
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  GripVertical, 
  FileText, 
  Map, 
  MapPin, 
  TestTube, 
  BarChart, 
  FolderOpen,
  Settings,
  Palette
} from "lucide-react";
import type { ReportSection, ReportMode } from "@/pages/ReportBuilder";
import { cn } from "@/lib/utils";

interface ReportSectionOutlineProps {
  sections: ReportSection[];
  selectedSectionId: string;
  onSectionSelect: (sectionId: string) => void;
  onSectionReorder: (draggedId: string, targetId: string) => void;
  onSectionToggle: (sectionId: string) => void;
  mode: ReportMode;
  reportMetadata: {
    fileName: string;
    footerText: string;
    companyLogo: string;
    brandColors: { primary: string; secondary: string };
  };
  onMetadataUpdate: (metadata: any) => void;
}

const sectionIcons = {
  cover: FileText,
  table_of_contents: FileText,
  introduction: FileText,
  layout_map: Map,
  location_map: MapPin,
  test_holes_summary: TestTube,
  test_section: BarChart,
  foundation_summary: BarChart,
  appendix: FolderOpen,
};

export function ReportSectionOutline({
  sections,
  selectedSectionId,
  onSectionSelect,
  onSectionReorder,
  onSectionToggle,
  mode,
  reportMetadata,
  onMetadataUpdate
}: ReportSectionOutlineProps) {
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    if (mode !== "edit") return;
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (mode !== "edit") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (mode !== "edit" || !draggedSection) return;
    e.preventDefault();
    
    if (draggedSection !== targetId) {
      onSectionReorder(draggedSection, targetId);
    }
    setDraggedSection(null);
  };

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Report Sections</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        
        {showSettings && (
          <Card className="mt-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Report Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="fileName" className="text-xs">File Name</Label>
                <Input
                  id="fileName"
                  value={reportMetadata.fileName}
                  onChange={(e) => onMetadataUpdate({
                    ...reportMetadata,
                    fileName: e.target.value
                  })}
                  disabled={mode === "review"}
                  className="h-8 text-xs"
                />
              </div>
              
              <div>
                <Label htmlFor="footerText" className="text-xs">Footer Text</Label>
                <Input
                  id="footerText"
                  value={reportMetadata.footerText}
                  onChange={(e) => onMetadataUpdate({
                    ...reportMetadata,
                    footerText: e.target.value
                  })}
                  placeholder="Company Name - Confidential"
                  className="h-8 text-xs"
                />
              </div>
              
              <div>
                <Label htmlFor="primaryColor" className="text-xs">Primary Color</Label>
                <Input
                  id="primaryColor"
                  type="color"
                  value={reportMetadata.brandColors.primary || "#3b82f6"}
                  onChange={(e) => onMetadataUpdate({
                    ...reportMetadata,
                    brandColors: {
                      ...reportMetadata.brandColors,
                      primary: e.target.value
                    }
                  })}
                  disabled={mode === "final"}
                  className="h-8 w-full"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Section List */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {sortedSections.map((section) => {
            const Icon = sectionIcons[section.type] || FileText;
            const isSelected = section.id === selectedSectionId;
            
            return (
              <div
                key={section.id}
                className={cn(
                  "group relative flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors",
                  isSelected 
                    ? "bg-primary/10 border-primary/30" 
                    : "bg-card border-border hover:bg-muted/50",
                  !section.enabled && "opacity-50"
                )}
                draggable={mode === "edit"}
                onDragStart={(e) => handleDragStart(e, section.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, section.id)}
                onClick={() => onSectionSelect(section.id)}
              >
                {mode === "edit" && (
                  <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 cursor-grab" />
                )}
                
                <Icon className="w-4 h-4 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {section.title}
                  </p>
                  {section.type === "test_section" && (
                    <p className="text-xs text-muted-foreground truncate">
                      Test Results
                    </p>
                  )}
                </div>
                
                {mode !== "final" && (
                <Switch
                  checked={section.enabled}
                  onCheckedChange={() => onSectionToggle(section.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                )}
                
                {section.enabled && (
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    {section.order + 1}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      
      {/* Mode Info */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Current Mode: {mode.toUpperCase()}</p>
          {mode === "edit" && (
            <p>• Full editing capabilities<br/>• Drag to reorder sections<br/>• Toggle sections on/off</p>
          )}
          {mode === "review" && (
            <p>• Structure locked<br/>• Text edits allowed<br/>• Comments enabled</p>
          )}
          {mode === "final" && (
            <p>• Content frozen<br/>• Export ready<br/>• Metadata only</p>
          )}
        </div>
      </div>
    </div>
  );
}
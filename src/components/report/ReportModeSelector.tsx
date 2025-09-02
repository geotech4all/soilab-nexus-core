import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit3, Eye, Lock } from "lucide-react";
import type { ReportMode } from "@/pages/ReportBuilder";

interface ReportModeSelectorProps {
  mode: ReportMode;
  onModeChange: (mode: ReportMode) => void;
}

export function ReportModeSelector({ mode, onModeChange }: ReportModeSelectorProps) {
  const modes: { key: ReportMode; label: string; icon: any; description: string; color: string }[] = [
    {
      key: "edit",
      label: "Edit",
      icon: Edit3,
      description: "Full editing capabilities",
      color: "default"
    },
    {
      key: "review",
      label: "Review",
      icon: Eye,
      description: "Text edits and comments only",
      color: "secondary"
    },
    {
      key: "final",
      label: "Final",
      icon: Lock,
      description: "Locked for export",
      color: "destructive"
    }
  ];

  return (
    <div className="flex items-center gap-2">
      {modes.map((modeOption) => (
        <Button
          key={modeOption.key}
          variant={mode === modeOption.key ? "default" : "outline"}
          size="sm"
          onClick={() => onModeChange(modeOption.key)}
          className="gap-2"
        >
          <modeOption.icon className="w-4 h-4" />
          {modeOption.label}
        </Button>
      ))}
      
      <Badge variant="outline" className="ml-2">
        {modes.find(m => m.key === mode)?.description}
      </Badge>
    </div>
  );
}
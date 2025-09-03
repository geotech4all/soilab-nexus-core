import React from "react";
import type { ReportMode } from "@/pages/ReportBuilder";
import { SPTTestResults } from "./test-sections/SPTTestResults";
import { CPTTestResults } from "./test-sections/CPTTestResults";
import { GenericTestResults } from "./test-sections/GenericTestResults";

interface TestResultSectionProps {
  testResult: any;
  mode: ReportMode;
  onContentUpdate: (content: any) => void;
}

export function TestResultSection({ testResult, mode, onContentUpdate }: TestResultSectionProps) {
  const testType = testResult.tests?.test_type?.toLowerCase() || "";

  const handleCaptionUpdate = (field: string, value: string) => {
    onContentUpdate({ [field]: value });
  };

  // Route to appropriate test result component based on test type
  switch (testType) {
    case "spt":
    case "standard_penetration":
      return (
        <SPTTestResults
          testResult={testResult}
          mode={mode}
          onCaptionUpdate={handleCaptionUpdate}
        />
      );

    case "cpt":
    case "cone_penetration":
      return (
        <CPTTestResults
          testResult={testResult}
          mode={mode}
          onCaptionUpdate={handleCaptionUpdate}
        />
      );

    case "atterberg":
    case "psd":
    case "particle_size_distribution":
    case "compaction":
    case "cbr":
    case "california_bearing_ratio":
    case "consolidation":
    case "shear":
    case "direct_shear":
    case "triaxial":
      return (
        <GenericTestResults
          testResult={testResult}
          mode={mode}
          testType={testType}
          onCaptionUpdate={handleCaptionUpdate}
        />
      );

    default:
      return (
        <GenericTestResults
          testResult={testResult}
          mode={mode}
          testType={testType || "unknown"}
          onCaptionUpdate={handleCaptionUpdate}
        />
      );
  }
}
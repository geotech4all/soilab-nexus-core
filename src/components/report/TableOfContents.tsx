import { FileText, Map, MapPin, TestTube, BarChart, FolderOpen } from "lucide-react";
import type { ReportSection } from "@/pages/ReportBuilder";

interface TableOfContentsProps {
  sections: ReportSection[];
  brandColors: { primary: string; secondary: string };
}

const sectionIcons = {
  cover: FileText,
  introduction: FileText,
  layout_map: Map,
  location_map: MapPin,
  test_holes_summary: TestTube,
  test_section: BarChart,
  foundation_summary: BarChart,
  appendix: FolderOpen,
};

export function TableOfContents({ sections, brandColors }: TableOfContentsProps) {
  // Filter enabled sections and calculate page numbers
  const enabledSections = sections
    .filter(section => section.enabled && section.type !== "cover")
    .sort((a, b) => a.order - b.order);

  let currentPage = 1; // Introduction starts at page 1
  const sectionsWithPages = enabledSections.map((section, index) => {
    const page = currentPage;
    // Each major section typically gets a new page
    if (index < enabledSections.length - 1) {
      currentPage++;
    }
    return { ...section, page };
  });

  return (
    <div className="space-y-8">
      {/* TOC Title */}
      <div className="text-center pb-6 border-b-2" style={{ borderColor: brandColors.primary || '#ef4444' }}>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Table of Contents</h1>
        <div className="h-1 w-24 mx-auto rounded" style={{ backgroundColor: brandColors.primary || '#ef4444' }} />
      </div>

      {/* TOC Entries */}
      <div className="space-y-3">
        {sectionsWithPages.map((section) => {
          const Icon = sectionIcons[section.type] || FileText;
          
          return (
            <div key={section.id} className="flex items-center justify-between py-2 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-gray-600" />
                <div>
                  <h3 className="font-medium text-gray-900">{section.title}</h3>
                  {section.type === "test_section" && (
                    <p className="text-sm text-gray-600">Test Results and Analysis</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="border-b border-dotted border-gray-400 flex-1 min-w-[100px]" />
                <span className="font-mono text-lg font-medium" style={{ color: brandColors.primary || '#ef4444' }}>
                  {section.page}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Appendices Section */}
      <div className="pt-6 border-t border-gray-300">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Appendices</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center justify-between py-1">
            <span>A. Laboratory Test Results</span>
            <div className="flex items-center gap-2">
              <div className="border-b border-dotted border-gray-400 flex-1 min-w-[50px]" />
              <span className="font-mono">A-1</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-1">
            <span>B. Borehole Logs</span>
            <div className="flex items-center gap-2">
              <div className="border-b border-dotted border-gray-400 flex-1 min-w-[50px]" />
              <span className="font-mono">B-1</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-1">
            <span>C. Foundation Analysis Calculations</span>
            <div className="flex items-center gap-2">
              <div className="border-b border-dotted border-gray-400 flex-1 min-w-[50px]" />
              <span className="font-mono">C-1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="pt-8 text-center">
        <p className="text-sm text-gray-500">
          This document contains {sectionsWithPages.length} main sections plus appendices
        </p>
      </div>
    </div>
  );
}
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Building2, Calendar, MapPin, User } from "lucide-react";
import type { ReportMode } from "@/pages/ReportBuilder";

interface CoverPageProps {
  project: any;
  content: any;
  onContentUpdate: (content: any) => void;
  mode: ReportMode;
  brandColors: { primary: string; secondary: string };
}

export function CoverPage({ project, content, onContentUpdate, mode, brandColors }: CoverPageProps) {
  const isEditable = mode !== "final";
  const isStructuralEdit = mode === "edit";

  const handleFieldUpdate = (field: string, value: string) => {
    if (!isEditable) return;
    onContentUpdate({ [field]: value });
  };

  const formatDate = (date: string) => {
    return date ? new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : 'Date not specified';
  };

  return (
    <div className="space-y-8">
      {/* Cover Page Display */}
      <div 
        className="relative min-h-[800px] bg-gradient-to-br from-white to-slate-50 border rounded-lg overflow-hidden"
        style={{
          background: brandColors.primary ? 
            `linear-gradient(135deg, ${brandColors.primary}08 0%, white 100%)` : 
            'linear-gradient(135deg, #ef444408 0%, white 100%)'
        }}
      >
        {/* Header Band */}
        <div 
          className="h-16 w-full"
          style={{ 
            backgroundColor: brandColors.primary || '#ef4444',
            background: brandColors.primary ? 
              `linear-gradient(90deg, ${brandColors.primary} 0%, ${brandColors.primary}dd 100%)` :
              'linear-gradient(90deg, #ef4444 0%, #ef4444dd 100%)'
          }}
        />

        {/* Company Logo Area */}
        <div className="absolute top-20 left-8">
          {content.companyLogo ? (
            <img src={content.companyLogo} alt="Company Logo" className="h-16 w-auto" />
          ) : (
            <div className="h-16 w-32 bg-white/50 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="pt-32 pb-16 px-8 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Report Title */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {content.title || "Geotechnical Investigation Report"}
              </h1>
              <div className="h-1 w-32 mx-auto rounded" style={{ backgroundColor: brandColors.primary || '#ef4444' }} />
            </div>

            {/* Project Info */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 shadow-lg">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                {content.subtitle || project.name}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 mt-1 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-700">Project Location</p>
                      <p className="text-gray-600">{content.location || project.location || "Location to be specified"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 mt-1 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-700">Client</p>
                      <p className="text-gray-600">{content.client || "Client name"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 mt-1 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-700">Investigation Date</p>
                      <p className="text-gray-600">{formatDate(content.investigationDate || project.created_at)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 mt-1 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-700">Project ID</p>
                      <p className="text-gray-600">{content.projectId || project.id?.slice(0, 8)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="text-center pt-8">
              <p className="text-lg font-medium text-gray-700">
                {content.companyName || "Geotech4All"}
              </p>
              <p className="text-gray-600">Geotechnical Engineering Consultants</p>
              {content.companyAddress && (
                <p className="text-sm text-gray-500 mt-2">{content.companyAddress}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 h-4" style={{ backgroundColor: brandColors.primary || '#ef4444' }} />
      </div>

      {/* Editing Controls */}
      {isStructuralEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cover Page Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Report Title</Label>
                <Input
                  id="title"
                  value={content.title || ""}
                  onChange={(e) => handleFieldUpdate("title", e.target.value)}
                  placeholder="Geotechnical Investigation Report"
                />
              </div>
              
              <div>
                <Label htmlFor="subtitle">Project Subtitle</Label>
                <Input
                  id="subtitle"
                  value={content.subtitle || ""}
                  onChange={(e) => handleFieldUpdate("subtitle", e.target.value)}
                  placeholder={project.name}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client">Client Name</Label>
                <Input
                  id="client"
                  value={content.client || ""}
                  onChange={(e) => handleFieldUpdate("client", e.target.value)}
                  placeholder="Client organization"
                />
              </div>
              
              <div>
                <Label htmlFor="projectId">Project ID</Label>
                <Input
                  id="projectId"
                  value={content.projectId || ""}
                  onChange={(e) => handleFieldUpdate("projectId", e.target.value)}
                  placeholder="Project reference number"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Project Location</Label>
              <Input
                id="location"
                value={content.location || ""}
                onChange={(e) => handleFieldUpdate("location", e.target.value)}
                placeholder={project.location || "Project location"}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={content.companyName || ""}
                  onChange={(e) => handleFieldUpdate("companyName", e.target.value)}
                  placeholder="Geotech4All"
                />
              </div>
              
              <div>
                <Label htmlFor="investigationDate">Investigation Date</Label>
                <Input
                  id="investigationDate"
                  type="date"
                  value={content.investigationDate || ""}
                  onChange={(e) => handleFieldUpdate("investigationDate", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="companyAddress">Company Address</Label>
              <Textarea
                id="companyAddress"
                value={content.companyAddress || ""}
                onChange={(e) => handleFieldUpdate("companyAddress", e.target.value)}
                placeholder="Company address and contact information"
                rows={3}
              />
            </div>

            <div>
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Company Logo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Recommended: PNG/SVG format, max 200px height
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
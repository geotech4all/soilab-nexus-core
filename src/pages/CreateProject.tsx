import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MapPin, Save } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Map from '@/components/Map';

const CreateProject = () => {
  const { userProfile, loading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    location: '',
    latitude: 40.7128,
    longitude: -74.0060
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleLocationSelect = (lat: number, lng: number) => {
    setProjectForm(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile?.company_id) {
      toast({
        title: 'Error',
        description: 'You must be associated with a company to create projects',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);

    try {
      const projectData = {
        name: projectForm.name,
        description: projectForm.description || null,
        location: projectForm.location || null,
        latitude: projectForm.latitude,
        longitude: projectForm.longitude,
        company_id: userProfile.company_id,
        user_id: userProfile.id
      };

      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Project created successfully!'
      });

      // Redirect to the new project page
      navigate(`/project/${data.id}`);

    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCoordinateChange = (field: 'latitude' | 'longitude', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setProjectForm(prev => ({
        ...prev,
        [field]: numValue
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !userProfile) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="hover-scale"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Project</h1>
            <p className="text-sm text-muted-foreground">Set up a new soil testing project</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Project Information */}
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>
                Basic details about your soil testing project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter project name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Project Description</Label>
                <Textarea
                  id="description"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the project goals, scope, and any relevant details"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location Name</Label>
                <Input
                  id="location"
                  value={projectForm.location}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter human-readable location (e.g., 'Downtown Manhattan, NY')"
                />
              </div>
            </CardContent>
          </Card>

          {/* Location Coordinates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Project Coordinates
              </CardTitle>
              <CardDescription>
                Set the precise location for your soil testing project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={projectForm.latitude}
                    onChange={(e) => handleCoordinateChange('latitude', e.target.value)}
                    placeholder="40.7128"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={projectForm.longitude}
                    onChange={(e) => handleCoordinateChange('longitude', e.target.value)}
                    placeholder="-74.0060"
                  />
                </div>
              </div>

              {/* Interactive Map */}
              <div className="space-y-2">
                <Label>Interactive Map</Label>
                <Map
                  latitude={projectForm.latitude}
                  longitude={projectForm.longitude}
                  onLocationSelect={handleLocationSelect}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isCreating || !projectForm.name.trim()}
              className="hover-scale"
            >
              {isCreating ? (
                <>Creating...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateProject;
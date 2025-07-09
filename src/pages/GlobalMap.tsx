import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPin, Filter } from 'lucide-react';

interface ProjectWithDetails {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  company_name: string;
  user_name: string;
  test_count: number;
}

const GlobalMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  
  // Filter states
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Mapbox token - in a real app, this would come from environment variables
  const MAPBOX_TOKEN = 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTBkZ3JvNGswMDJuMmxzYWZhY2tscnRwIn0.CmBHB1SjAaRXqgBGlI1HpA';

  const fetchProjects = async () => {
    try {
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          latitude,
          longitude,
          companies!inner(name),
          users!inner(full_name)
        `)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;

      // Fetch test counts for each project
      const projectsWithTestCounts = await Promise.all(
        projectsData.map(async (project) => {
          const { count } = await supabase
            .from('tests')
            .select('id', { count: 'exact' })
            .eq('project_id', project.id);

          return {
            id: project.id,
            name: project.name,
            description: project.description || '',
            latitude: Number(project.latitude),
            longitude: Number(project.longitude),
            company_name: project.companies.name,
            user_name: project.users.full_name,
            test_count: count || 0,
          };
        })
      );

      setProjects(projectsWithTestCounts);
      setFilteredProjects(projectsWithTestCounts);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [companiesResult, usersResult] = await Promise.all([
        supabase.from('companies').select('id, name'),
        supabase.from('users').select('id, full_name')
      ]);

      if (companiesResult.data) setCompanies(companiesResult.data);
      if (usersResult.data) setUsers(usersResult.data);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProjects(), fetchFilterOptions()]);
      setLoading(false);
    };

    loadData();
  }, []);

  // Filter projects based on selected filters
  useEffect(() => {
    let filtered = projects;

    if (selectedCompany !== 'all') {
      filtered = filtered.filter(p => p.company_name === selectedCompany);
    }

    if (selectedUser !== 'all') {
      filtered = filtered.filter(p => p.user_name === selectedUser);
    }

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProjects(filtered);
  }, [projects, selectedCompany, selectedUser, searchTerm]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [0, 20],
      zoom: 2,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update map markers when filtered projects change
  useEffect(() => {
    if (!map.current || loading) return;

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Add markers for filtered projects
    filteredProjects.forEach((project) => {
      // Create custom marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'w-8 h-8 bg-primary rounded-full border-2 border-background shadow-lg cursor-pointer flex items-center justify-center';
      markerElement.innerHTML = '<svg class="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg>';

      // Create popup content
      const popupContent = `
        <div class="p-3 min-w-[200px]">
          <h3 class="font-semibold text-sm mb-1">${project.name}</h3>
          <p class="text-xs text-muted-foreground mb-2">${project.company_name}</p>
          <p class="text-xs mb-2">${project.test_count} test${project.test_count !== 1 ? 's' : ''}</p>
          <button 
            onclick="window.location.href='/project/${project.id}'"
            class="w-full bg-primary text-primary-foreground px-2 py-1 rounded text-xs hover:bg-primary/90"
          >
            View Project
          </button>
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
      }).setHTML(popupContent);

      new mapboxgl.Marker(markerElement)
        .setLngLat([project.longitude, project.latitude])
        .setPopup(popup)
        .addTo(map.current!);
    });

    // Fit map to show all markers if there are any
    if (filteredProjects.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      filteredProjects.forEach(project => {
        bounds.extend([project.longitude, project.latitude]);
      });
      
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 10,
      });
    }
  }, [filteredProjects, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Global Project Map</h1>
              <p className="text-muted-foreground">
                Showing {filteredProjects.length} of {projects.length} projects
              </p>
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="search">Search Projects</Label>
                    <Input
                      id="search"
                      placeholder="Search by name or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                      <SelectTrigger id="company">
                        <SelectValue placeholder="All companies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Companies</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.name}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="user">User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger id="user">
                        <SelectValue placeholder="All users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.full_name}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <div ref={mapContainer} className="w-full h-[600px] rounded-lg" />
          </CardContent>
        </Card>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4" onClick={() => navigate(`/project/${project.id}`)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">{project.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{project.company_name}</p>
                    <p className="text-xs mb-2">{project.test_count} test{project.test_count !== 1 ? 's' : ''}</p>
                  </div>
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GlobalMap;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface StratigraphyLayer {
  id: string;
  topDepth: number;
  bottomDepth: number;
  soilType: string;
  color: string;
  texture: string;
  description: string;
}

interface Borehole {
  id: string;
  name: string;
  depth: number | null;
  coordinates: any;
  stratigraphy: any;
  project_id: string;
}

const BoreholeLog = () => {
  const { boreholeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [borehole, setBorehole] = useState<Borehole | null>(null);
  const [layers, setLayers] = useState<StratigraphyLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBorehole();
  }, [boreholeId]);

  const fetchBorehole = async () => {
    try {
      const { data, error } = await supabase
        .from('boreholes')
        .select('*')
        .eq('id', boreholeId)
        .single();

      if (error) throw error;

      setBorehole(data);
      setLayers(Array.isArray(data.stratigraphy) ? data.stratigraphy as unknown as StratigraphyLayer[] : []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addLayer = () => {
    const newLayer: StratigraphyLayer = {
      id: Date.now().toString(),
      topDepth: layers.length > 0 ? Math.max(...layers.map(l => l.bottomDepth)) : 0,
      bottomDepth: layers.length > 0 ? Math.max(...layers.map(l => l.bottomDepth)) + 1 : 1,
      soilType: '',
      color: '',
      texture: '',
      description: ''
    };
    setLayers([...layers, newLayer]);
  };

  const removeLayer = (id: string) => {
    setLayers(layers.filter(layer => layer.id !== id));
  };

  const updateLayer = (id: string, field: keyof StratigraphyLayer, value: string | number) => {
    setLayers(layers.map(layer => 
      layer.id === id ? { ...layer, [field]: value } : layer
    ));
  };

  const saveBorehole = async () => {
    if (!borehole) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('boreholes')
        .update({ stratigraphy: layers as any })
        .eq('id', borehole.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Borehole log saved successfully",
      });

      navigate(`/project/${borehole.project_id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getVisualHeight = (layer: StratigraphyLayer) => {
    const totalDepth = borehole?.depth || 1;
    const layerThickness = layer.bottomDepth - layer.topDepth;
    return Math.max((layerThickness / totalDepth) * 300, 20); // Min 20px height
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!borehole) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Borehole not found</h1>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(`/project/${borehole.project_id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{borehole.name}</h1>
            <p className="text-muted-foreground">
              Depth: {borehole.depth || 0}m | Coordinates: {borehole.coordinates?.coordinates?.[1]?.toFixed(6) || 'N/A'}, {borehole.coordinates?.coordinates?.[0]?.toFixed(6) || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={addLayer} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Layer
          </Button>
          <Button onClick={saveBorehole} disabled={saving}>
            {saving ? "Saving..." : "Save Borehole Log"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stratigraphy Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Stratigraphy Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {layers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No layers defined. Click "Add Layer" to start.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Top (m)</TableHead>
                      <TableHead>Bottom (m)</TableHead>
                      <TableHead>Soil Type</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Texture</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {layers.map((layer) => (
                      <TableRow key={layer.id}>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={layer.topDepth}
                            onChange={(e) => updateLayer(layer.id, 'topDepth', parseFloat(e.target.value) || 0)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={layer.bottomDepth}
                            onChange={(e) => updateLayer(layer.id, 'bottomDepth', parseFloat(e.target.value) || 0)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={layer.soilType}
                            onChange={(e) => updateLayer(layer.id, 'soilType', e.target.value)}
                            placeholder="Clay, Sand, etc."
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={layer.color}
                            onChange={(e) => updateLayer(layer.id, 'color', e.target.value)}
                            placeholder="Brown, Gray, etc."
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={layer.texture}
                            onChange={(e) => updateLayer(layer.id, 'texture', e.target.value)}
                            placeholder="Fine, Coarse, etc."
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Textarea
                            value={layer.description}
                            onChange={(e) => updateLayer(layer.id, 'description', e.target.value)}
                            placeholder="Additional notes..."
                            className="w-32 h-12 resize-none"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeLayer(layer.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Visual Borehole Log */}
        <Card>
          <CardHeader>
            <CardTitle>Visual Borehole Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-background">
              <div className="flex">
                {/* Depth Scale */}
                <div className="w-16 mr-4">
                  <div className="text-sm font-medium mb-2">Depth (m)</div>
                  {layers.map((layer, index) => (
                    <div 
                      key={layer.id}
                      style={{ height: `${getVisualHeight(layer)}px` }}
                      className="flex flex-col justify-between text-xs border-r pr-2"
                    >
                      <span>{layer.topDepth}</span>
                      {index === layers.length - 1 && (
                        <span className="mt-auto">{layer.bottomDepth}</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Borehole Column */}
                <div className="flex-1 min-w-48">
                  <div className="text-sm font-medium mb-2">Stratigraphy</div>
                  {layers.length === 0 ? (
                    <div className="h-64 bg-muted rounded flex items-center justify-center text-muted-foreground">
                      No layers to display
                    </div>
                  ) : (
                    <div className="border">
                      {layers.map((layer) => (
                        <div
                          key={layer.id}
                          style={{ 
                            height: `${getVisualHeight(layer)}px`,
                            backgroundColor: layer.color ? `var(--${layer.color.toLowerCase()})` : '#f3f4f6'
                          }}
                          className="border-b last:border-b-0 flex items-center px-3 relative"
                        >
                          <div className="text-sm font-medium text-foreground bg-background/80 px-2 py-1 rounded">
                            {layer.soilType || 'Unnamed Layer'}
                            {layer.texture && ` (${layer.texture})`}
                          </div>
                          {layer.description && (
                            <div className="absolute right-2 top-1 text-xs text-muted-foreground bg-background/80 px-1 rounded">
                              {layer.description.substring(0, 20)}{layer.description.length > 20 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BoreholeLog;
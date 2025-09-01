import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Layers } from 'lucide-react';

interface Borehole {
  id: string;
  name: string;
  depth: number | null;
  stratigraphy: any;
}

interface Layer {
  id: string;
  boreholeId: string;
  fromDepth: number;
  toDepth: number;
  soilType: string;
  unitWeight: number;
  cohesion: number;
  frictionAngle: number;
}

interface LayerPickerProps {
  boreholes: Borehole[];
  selectedLayers: Layer[];
  onLayersChange: (layers: Layer[]) => void;
}

export const LayerPicker = ({ boreholes, selectedLayers, onLayersChange }: LayerPickerProps) => {
  const [newLayer, setNewLayer] = useState<Partial<Layer>>({
    boreholeId: '',
    fromDepth: 0,
    toDepth: 0,
    soilType: '',
    unitWeight: 18.0,
    cohesion: 0,
    frictionAngle: 30
  });

  const addLayer = () => {
    if (!newLayer.boreholeId || newLayer.fromDepth === undefined || newLayer.toDepth === undefined) {
      return;
    }

    const layer: Layer = {
      id: Date.now().toString(),
      boreholeId: newLayer.boreholeId,
      fromDepth: newLayer.fromDepth,
      toDepth: newLayer.toDepth,
      soilType: newLayer.soilType || 'Unknown',
      unitWeight: newLayer.unitWeight || 18.0,
      cohesion: newLayer.cohesion || 0,
      frictionAngle: newLayer.frictionAngle || 30
    };

    onLayersChange([...selectedLayers, layer]);
    
    // Reset form
    setNewLayer({
      boreholeId: '',
      fromDepth: 0,
      toDepth: 0,
      soilType: '',
      unitWeight: 18.0,
      cohesion: 0,
      frictionAngle: 30
    });
  };

  const removeLayer = (layerId: string) => {
    onLayersChange(selectedLayers.filter(layer => layer.id !== layerId));
  };

  const updateLayer = (layerId: string, updates: Partial<Layer>) => {
    onLayersChange(
      selectedLayers.map(layer => 
        layer.id === layerId ? { ...layer, ...updates } : layer
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Add New Layer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Soil Layer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Borehole</Label>
              <Select 
                value={newLayer.boreholeId} 
                onValueChange={(value) => setNewLayer({ ...newLayer, boreholeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select borehole" />
                </SelectTrigger>
                <SelectContent>
                  {boreholes.map(bh => (
                    <SelectItem key={bh.id} value={bh.id}>
                      {bh.name} ({bh.depth ? `${bh.depth}m` : 'No depth'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Soil Type</Label>
              <Select 
                value={newLayer.soilType} 
                onValueChange={(value) => setNewLayer({ ...newLayer, soilType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select soil type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clay">Clay</SelectItem>
                  <SelectItem value="sand">Sand</SelectItem>
                  <SelectItem value="silt">Silt</SelectItem>
                  <SelectItem value="gravel">Gravel</SelectItem>
                  <SelectItem value="silty_clay">Silty Clay</SelectItem>
                  <SelectItem value="sandy_clay">Sandy Clay</SelectItem>
                  <SelectItem value="clayey_sand">Clayey Sand</SelectItem>
                  <SelectItem value="rock">Rock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>From Depth (m)</Label>
              <Input
                type="number"
                step="0.1"
                value={newLayer.fromDepth || ''}
                onChange={(e) => setNewLayer({ ...newLayer, fromDepth: parseFloat(e.target.value) })}
                placeholder="0.0"
              />
            </div>

            <div className="space-y-2">
              <Label>To Depth (m)</Label>
              <Input
                type="number"
                step="0.1"
                value={newLayer.toDepth || ''}
                onChange={(e) => setNewLayer({ ...newLayer, toDepth: parseFloat(e.target.value) })}
                placeholder="1.0"
              />
            </div>

            <div className="space-y-2">
              <Label>Unit Weight (kN/m³)</Label>
              <Input
                type="number"
                step="0.1"
                value={newLayer.unitWeight || ''}
                onChange={(e) => setNewLayer({ ...newLayer, unitWeight: parseFloat(e.target.value) })}
                placeholder="18.0"
              />
            </div>

            <div className="space-y-2">
              <Label>Cohesion (kPa)</Label>
              <Input
                type="number"
                step="0.1"
                value={newLayer.cohesion || ''}
                onChange={(e) => setNewLayer({ ...newLayer, cohesion: parseFloat(e.target.value) })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Friction Angle (°)</Label>
              <Input
                type="number"
                step="0.1"
                value={newLayer.frictionAngle || ''}
                onChange={(e) => setNewLayer({ ...newLayer, frictionAngle: parseFloat(e.target.value) })}
                placeholder="30"
              />
            </div>

            <div className="flex items-end">
              <Button onClick={addLayer} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Layer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Layers */}
      {selectedLayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Selected Layers ({selectedLayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedLayers.map(layer => {
                const borehole = boreholes.find(bh => bh.id === layer.boreholeId);
                return (
                  <div key={layer.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex-1 grid grid-cols-6 gap-2 text-sm">
                      <div>
                        <div className="font-medium">{borehole?.name}</div>
                        <div className="text-muted-foreground">{layer.soilType}</div>
                      </div>
                      <div>
                        <div className="font-medium">{layer.fromDepth}m</div>
                        <div className="text-muted-foreground">From</div>
                      </div>
                      <div>
                        <div className="font-medium">{layer.toDepth}m</div>
                        <div className="text-muted-foreground">To</div>
                      </div>
                      <div>
                        <div className="font-medium">{layer.unitWeight}</div>
                        <div className="text-muted-foreground">kN/m³</div>
                      </div>
                      <div>
                        <div className="font-medium">{layer.cohesion}</div>
                        <div className="text-muted-foreground">kPa</div>
                      </div>
                      <div>
                        <div className="font-medium">{layer.frictionAngle}°</div>
                        <div className="text-muted-foreground">φ</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLayer(layer.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedLayers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No soil layers selected</p>
          <p className="text-sm">Add soil layers to define the foundation analysis parameters</p>
        </div>
      )}
    </div>
  );
};
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings, Building, Droplets } from 'lucide-react';

interface FoundationParams {
  foundationType: 'shallow' | 'deep';
  subType: string;
  designStandard: string;
  factorOfSafety: number;
  groundwaterLevel: number | null;
  unitWeight: number;
  cohesion: number;
  frictionAngle: number;
  footingWidth: number | null;
  embedmentDepth: number | null;
  pileLength: number | null;
  pileDiameter: number | null;
  selectedLayers: any[];
}

interface Test {
  id: string;
  test_type: string;
  status: string;
}

interface FoundationInputsProps {
  params: FoundationParams;
  setParams: (params: FoundationParams) => void;
  tests: Test[];
}

export const FoundationInputs = ({ params, setParams, tests }: FoundationInputsProps) => {
  const updateParam = (key: keyof FoundationParams, value: any) => {
    setParams({ ...params, [key]: value });
  };

  const getShallowSubTypes = () => [
    { value: 'strip', label: 'Strip Footing' },
    { value: 'pad', label: 'Pad Footing' },
    { value: 'raft', label: 'Raft Foundation' }
  ];

  const getDeepSubTypes = () => [
    { value: 'single_pile', label: 'Single Pile' },
    { value: 'pile_group', label: 'Pile Group' }
  ];

  const designStandards = [
    { value: 'eurocode7', label: 'Eurocode 7' },
    { value: 'bs', label: 'British Standard' },
    { value: 'aashto', label: 'AASHTO' },
    { value: 'api', label: 'API' },
    { value: 'as', label: 'Australian Standard' }
  ];

  return (
    <div className="space-y-6">
      {/* Foundation Type Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Building className="h-5 w-5" />
          Foundation Configuration
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Foundation Type</Label>
            <Select 
              value={params.foundationType} 
              onValueChange={(value: 'shallow' | 'deep') => updateParam('foundationType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shallow">Shallow Foundation</SelectItem>
                <SelectItem value="deep">Deep Foundation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sub-type</Label>
            <Select 
              value={params.subType} 
              onValueChange={(value) => updateParam('subType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {params.foundationType === 'shallow' 
                  ? getShallowSubTypes().map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))
                  : getDeepSubTypes().map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))
                }
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Design Parameters */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Design Parameters
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Design Standard</Label>
            <Select 
              value={params.designStandard} 
              onValueChange={(value) => updateParam('designStandard', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {designStandards.map(std => (
                  <SelectItem key={std.value} value={std.value}>{std.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Factor of Safety</Label>
            <Input
              type="number"
              step="0.1"
              value={params.factorOfSafety}
              onChange={(e) => updateParam('factorOfSafety', parseFloat(e.target.value))}
              placeholder="2.5"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            Groundwater Level (m below ground)
          </Label>
          <Input
            type="number"
            step="0.1"
            value={params.groundwaterLevel || ''}
            onChange={(e) => updateParam('groundwaterLevel', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="Enter depth to groundwater (optional)"
          />
        </div>
      </div>

      <Separator />

      {/* Foundation Specific Parameters */}
      {params.foundationType === 'shallow' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Shallow Foundation Parameters</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Footing Width (m)</Label>
              <Input
                type="number"
                step="0.1"
                value={params.footingWidth || ''}
                onChange={(e) => updateParam('footingWidth', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="2.0"
              />
            </div>

            <div className="space-y-2">
              <Label>Embedment Depth (m)</Label>
              <Input
                type="number"
                step="0.1"
                value={params.embedmentDepth || ''}
                onChange={(e) => updateParam('embedmentDepth', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="1.0"
              />
            </div>
          </div>

          {params.subType === 'raft' && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Additional raft parameters like length, thickness, and load distribution will be computed based on selected layers.
              </p>
            </div>
          )}
        </div>
      )}

      {params.foundationType === 'deep' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Deep Foundation Parameters</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pile Length (m)</Label>
              <Input
                type="number"
                step="0.1"
                value={params.pileLength || ''}
                onChange={(e) => updateParam('pileLength', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="15.0"
              />
            </div>

            <div className="space-y-2">
              <Label>Pile Diameter (m)</Label>
              <Input
                type="number"
                step="0.01"
                value={params.pileDiameter || ''}
                onChange={(e) => updateParam('pileDiameter', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0.6"
              />
            </div>
          </div>

          {params.subType === 'pile_group' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Number of Piles</Label>
                <Input
                  type="number"
                  placeholder="4"
                />
              </div>
              <div className="space-y-2">
                <Label>Spacing (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="2.5"
                />
              </div>
              <div className="space-y-2">
                <Label>Configuration</Label>
                <Select defaultValue="square">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="rectangular">Rectangular</SelectItem>
                    <SelectItem value="triangular">Triangular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* Available Test Data Summary */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Available Test Data</h3>
        <div className="grid grid-cols-3 gap-4">
          {['SPT', 'CPT', 'Atterberg', 'Consolidation', 'PSD', 'Compaction'].map(testType => {
            const count = tests.filter(t => t.test_type === testType).length;
            return (
              <div key={testType} className="text-center p-3 border rounded-lg">
                <div className="font-semibold">{count}</div>
                <div className="text-sm text-muted-foreground">{testType}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
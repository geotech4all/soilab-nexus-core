import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface ShallowFoundationRequest {
  project_id: string;
  parameters: {
    foundationType: 'shallow';
    subType: 'strip' | 'pad' | 'raft';
    designStandard: string;
    factorOfSafety: number;
    groundwaterLevel?: number;
    footingWidth: number;
    embedmentDepth: number;
    selectedLayers: Array<{
      fromDepth: number;
      toDepth: number;
      soilType: string;
      unitWeight: number;
      cohesion: number;
      frictionAngle: number;
    }>;
  };
  test_data: Array<any>;
}

interface ShallowFoundationResponse {
  status: string;
  ultimate_capacity: number;
  allowable_load: number;
  allowable_pressure: number;
  immediate_settlement: number;
  consolidation_settlement: number;
  total_settlement: number;
  controlling_limit_state: string;
  method_used: string;
  critical_layer: string;
  recommendations: string[];
  warnings: string[];
  chart_data: {
    capacity_depth: Array<{ depth: number; capacity: number }>;
    load_settlement: Array<{ load: number; settlement: number }>;
    capacity_components: Array<{ component: string; value: number }>;
  };
  layer_analysis: Array<{
    from_depth: number;
    to_depth: number;
    soil_type: string;
    contribution: number;
    is_critical: boolean;
  }>;
  calculation_details: any;
}

function calculateTerzaghiBearingCapacity(
  c: number, // cohesion
  gamma: number, // unit weight
  phi: number, // friction angle in degrees
  B: number, // footing width
  D: number, // embedment depth
  shape: string = 'strip'
): { qult: number; nc: number; nq: number; ng: number } {
  const phi_rad = (phi * Math.PI) / 180;
  
  // Terzaghi bearing capacity factors
  const nq = Math.exp(Math.PI * Math.tan(phi_rad)) * Math.pow(Math.tan(Math.PI / 4 + phi_rad / 2), 2);
  const nc = (nq - 1) / Math.tan(phi_rad);
  
  // Simplified Ng calculation
  let ng: number;
  if (phi === 0) {
    ng = 0;
  } else {
    ng = 2 * (nq + 1) * Math.tan(phi_rad);
  }

  // Shape factors (simplified)
  let sc = 1, sq = 1, sg = 1;
  if (shape === 'square' || shape === 'pad') {
    sc = 1.3;
    sq = 1.2;
    sg = 0.8;
  } else if (shape === 'circular') {
    sc = 1.3;
    sq = 1.3;
    sg = 0.6;
  }

  // Ultimate bearing capacity
  const qult = c * nc * sc + gamma * D * nq * sq + 0.5 * gamma * B * ng * sg;

  return { qult, nc, nq, ng };
}

function calculateMeyerhofBearingCapacity(
  c: number,
  gamma: number,
  phi: number,
  B: number,
  D: number,
  shape: string = 'strip'
): number {
  const phi_rad = (phi * Math.PI) / 180;
  
  // Meyerhof bearing capacity factors
  const nq = Math.exp(Math.PI * Math.tan(phi_rad)) * Math.pow(Math.tan(Math.PI / 4 + phi_rad / 2), 2);
  const nc = (nq - 1) / Math.tan(phi_rad);
  const ng = (nq - 1) * Math.tan(1.4 * phi_rad);

  // Shape factors
  let sc = 1, sq = 1, sg = 1;
  if (shape === 'square' || shape === 'pad') {
    sc = 1 + 0.2 * (B / B); // For square: L/B = 1
    sq = 1 + 0.2 * (B / B);
    sg = 1 - 0.4 * (B / B);
  }

  // Depth factors (simplified)
  const dc = 1 + 0.2 * Math.sqrt(nq) * (D / B);
  const dq = 1 + 0.1 * Math.sqrt(nq) * (D / B);
  const dg = 1 + 0.1 * (D / B);

  return c * nc * sc * dc + gamma * D * nq * sq * dq + 0.5 * gamma * B * ng * sg * dg;
}

function calculateSettlement(
  load: number,
  B: number,
  E: number, // Young's modulus
  nu: number = 0.3, // Poisson's ratio
  H: number = 10 // influence depth
): { immediate: number; consolidation: number } {
  // Immediate settlement (elastic)
  const I = 1.0; // influence factor (simplified)
  const immediate = (load * B * (1 - nu * nu) * I) / E;

  // Consolidation settlement (simplified)
  // This would normally require oedometer data
  const cc = 0.01; // compression index (assumed)
  const e0 = 0.8; // initial void ratio (assumed)
  const sigma_initial = 100; // initial stress (kPa)
  const delta_sigma = load / (B * B); // stress increase
  
  const consolidation = (cc * H * Math.log10((sigma_initial + delta_sigma) / sigma_initial)) / (1 + e0);

  return {
    immediate: immediate * 1000, // convert to mm
    consolidation: consolidation * 1000 // convert to mm
  };
}

function generateChartData(
  params: ShallowFoundationRequest['parameters'],
  results: any
): ShallowFoundationResponse['chart_data'] {
  // Capacity vs depth chart
  const capacity_depth = [];
  for (let depth = 0.5; depth <= 5; depth += 0.5) {
    const layer = params.selectedLayers.find(l => depth >= l.fromDepth && depth <= l.toDepth) || params.selectedLayers[0];
    if (layer) {
      const { qult } = calculateTerzaghiBearingCapacity(
        layer.cohesion,
        layer.unitWeight,
        layer.frictionAngle,
        params.footingWidth,
        depth,
        params.subType
      );
      capacity_depth.push({ depth, capacity: qult * params.footingWidth * params.footingWidth });
    }
  }

  // Load-settlement curve
  const load_settlement = [];
  const maxLoad = results.ultimate_capacity;
  for (let load = 0; load <= maxLoad; load += maxLoad / 10) {
    const settlement = (load / maxLoad) * results.total_settlement;
    load_settlement.push({ load, settlement });
  }

  // Bearing capacity components
  const capacity_components = [
    { component: 'Cohesion', value: results.cohesion_component || 0 },
    { component: 'Surcharge', value: results.surcharge_component || 0 },
    { component: 'Unit Weight', value: results.weight_component || 0 }
  ];

  return { capacity_depth, load_settlement, capacity_components };
}

async function calculateShallowFoundation(request: ShallowFoundationRequest): Promise<ShallowFoundationResponse> {
  const { parameters } = request;
  
  if (parameters.selectedLayers.length === 0) {
    throw new Error('No soil layers selected for analysis');
  }

  // Find critical layer (typically the weakest or controlling layer)
  const criticalLayer = parameters.selectedLayers.reduce((prev, curr) => {
    const prevCapacity = calculateTerzaghiBearingCapacity(
      prev.cohesion, prev.unitWeight, prev.frictionAngle,
      parameters.footingWidth, parameters.embedmentDepth, parameters.subType
    ).qult;
    const currCapacity = calculateTerzaghiBearingCapacity(
      curr.cohesion, curr.unitWeight, curr.frictionAngle,
      parameters.footingWidth, parameters.embedmentDepth, parameters.subType
    ).qult;
    return prevCapacity < currCapacity ? prev : curr;
  });

  // Calculate bearing capacity using multiple methods
  const terzaghi = calculateTerzaghiBearingCapacity(
    criticalLayer.cohesion,
    criticalLayer.unitWeight,
    criticalLayer.frictionAngle,
    parameters.footingWidth,
    parameters.embedmentDepth,
    parameters.subType
  );

  const meyerhof = calculateMeyerhofBearingCapacity(
    criticalLayer.cohesion,
    criticalLayer.unitWeight,
    criticalLayer.frictionAngle,
    parameters.footingWidth,
    parameters.embedmentDepth,
    parameters.subType
  );

  // Use the more conservative (lower) value
  const ultimate_capacity = Math.min(terzaghi.qult, meyerhof) * parameters.footingWidth * parameters.footingWidth;
  const allowable_load = ultimate_capacity / parameters.factorOfSafety;
  const allowable_pressure = allowable_load / (parameters.footingWidth * parameters.footingWidth);

  // Settlement calculations
  const E = criticalLayer.frictionAngle > 0 ? 10000 + criticalLayer.frictionAngle * 500 : 5000; // Estimated modulus
  const settlement = calculateSettlement(allowable_load, parameters.footingWidth, E);

  // Warnings and recommendations
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (allowable_pressure < 100) {
    warnings.push('Very low bearing capacity - consider soil improvement');
  }
  if (settlement.total > 25) {
    warnings.push('Excessive settlement predicted - consider reducing load or increasing footing size');
  }
  if (parameters.groundwaterLevel && parameters.groundwaterLevel < parameters.embedmentDepth + 1) {
    warnings.push('Groundwater level is close to foundation - consider dewatering or waterproofing');
  }

  recommendations.push(`Use ${parameters.designStandard.toUpperCase()} standards for final design`);
  recommendations.push('Verify soil parameters with additional testing if necessary');
  recommendations.push('Consider construction sequence effects on bearing capacity');

  // Generate layer analysis
  const layer_analysis = parameters.selectedLayers.map(layer => {
    const layerCapacity = calculateTerzaghiBearingCapacity(
      layer.cohesion, layer.unitWeight, layer.frictionAngle,
      parameters.footingWidth, parameters.embedmentDepth, parameters.subType
    ).qult * parameters.footingWidth * parameters.footingWidth;

    return {
      from_depth: layer.fromDepth,
      to_depth: layer.toDepth,
      soil_type: layer.soilType,
      contribution: layerCapacity,
      is_critical: layer === criticalLayer
    };
  });

  const results = {
    status: 'success',
    ultimate_capacity,
    allowable_load,
    allowable_pressure,
    immediate_settlement: settlement.immediate,
    consolidation_settlement: settlement.consolidation,
    total_settlement: settlement.immediate + settlement.consolidation,
    controlling_limit_state: settlement.immediate + settlement.consolidation > 25 ? 'Settlement' : 'Bearing capacity',
    method_used: ultimate_capacity === terzaghi.qult * parameters.footingWidth * parameters.footingWidth ? 'Terzaghi' : 'Meyerhof',
    critical_layer: `${criticalLayer.soilType} (${criticalLayer.fromDepth}m - ${criticalLayer.toDepth}m)`,
    recommendations,
    warnings,
    layer_analysis,
    calculation_details: {
      terzaghi_factors: terzaghi,
      meyerhof_capacity: meyerhof,
      modulus_used: E,
      critical_layer: criticalLayer
    }
  } as Partial<ShallowFoundationResponse>;

  results.chart_data = generateChartData(parameters, results);

  return results as ShallowFoundationResponse;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const request: ShallowFoundationRequest = await req.json();

    if (!request.project_id || !request.parameters) {
      throw new Error('Missing required fields: project_id and parameters are required');
    }

    console.log('Processing shallow foundation calculation for project:', request.project_id);

    const results = await calculateShallowFoundation(request);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in compute-foundation-shallow function:', error);
    
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error.message,
        message: 'Failed to compute shallow foundation analysis'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
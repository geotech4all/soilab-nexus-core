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

interface PileFoundationRequest {
  project_id: string;
  parameters: {
    foundationType: 'deep';
    subType: 'single_pile' | 'pile_group';
    designStandard: string;
    factorOfSafety: number;
    groundwaterLevel?: number;
    pileLength: number;
    pileDiameter: number;
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

interface PileFoundationResponse {
  status: string;
  ultimate_capacity: number;
  allowable_load: number;
  shaft_capacity: number;
  base_capacity: number;
  group_efficiency?: number;
  total_settlement: number;
  negative_skin_friction?: number;
  controlling_limit_state: string;
  method_used: string;
  critical_layer: string;
  recommendations: string[];
  warnings: string[];
  chart_data: {
    capacity_depth: Array<{ depth: number; capacity: number }>;
    load_settlement: Array<{ load: number; settlement: number }>;
    shaft_distribution: Array<{ depth: number; shaft_stress: number }>;
  };
  layer_analysis: Array<{
    from_depth: number;
    to_depth: number;
    soil_type: string;
    shaft_contribution: number;
    is_critical: boolean;
  }>;
  calculation_details: any;
}

function calculateAlphaMethod(
  c: number, // undrained shear strength
  diameter: number,
  length: number
): { alpha: number; shaft_capacity: number } {
  // Alpha method for cohesive soils
  let alpha: number;
  
  if (c <= 25) {
    alpha = 1.0;
  } else if (c <= 50) {
    alpha = 1.0 - 0.004 * (c - 25);
  } else if (c <= 100) {
    alpha = 0.9 - 0.006 * (c - 50);
  } else {
    alpha = 0.6;
  }

  const perimeter = Math.PI * diameter;
  const shaft_capacity = alpha * c * perimeter * length;

  return { alpha, shaft_capacity };
}

function calculateBetaMethod(
  phi: number, // friction angle in degrees
  sigma_v: number, // vertical effective stress
  diameter: number,
  length: number
): { beta: number; shaft_capacity: number } {
  // Beta method for cohesionless soils
  const phi_rad = (phi * Math.PI) / 180;
  const Ka = (1 - Math.sin(phi_rad)) / (1 + Math.sin(phi_rad)); // Active earth pressure coefficient
  
  // Simplified beta calculation
  const beta = Ka * Math.tan(phi_rad * 0.8); // Reduced friction angle for pile-soil interface

  const perimeter = Math.PI * diameter;
  const average_stress = sigma_v / 2; // Simplified average stress along pile
  const shaft_capacity = beta * average_stress * perimeter * length;

  return { beta, shaft_capacity };
}

function calculateBaseCapacity(
  c: number,
  phi: number,
  sigma_v: number, // vertical stress at pile tip
  diameter: number,
  method: string = 'SPT'
): number {
  const area = Math.PI * diameter * diameter / 4;
  
  if (c > 0) {
    // Cohesive soil - bearing capacity approach
    const nc = 9; // For deep foundations in clay
    return nc * c * area;
  } else {
    // Cohesionless soil
    const phi_rad = (phi * Math.PI) / 180;
    const nq = Math.exp(Math.PI * Math.tan(phi_rad)) * Math.pow(Math.tan(Math.PI / 4 + phi_rad / 2), 2);
    
    // Apply reduction factor for deep foundations
    const reduction_factor = method === 'CPT' ? 0.6 : 0.5;
    return sigma_v * nq * area * reduction_factor;
  }
}

function calculateGroupEfficiency(
  n_piles: number,
  spacing: number,
  diameter: number,
  configuration: string = 'square'
): number {
  // Simplified group efficiency calculation
  const s_d_ratio = spacing / diameter;
  
  if (s_d_ratio >= 6) {
    return 1.0; // No group effect
  } else if (s_d_ratio >= 3) {
    return 0.85 + 0.15 * (s_d_ratio - 3) / 3;
  } else {
    // Converse-Labarre formula (simplified)
    const m = Math.sqrt(n_piles); // Assume square arrangement
    const theta = Math.atan(diameter / spacing) * 180 / Math.PI;
    
    return 1 - (theta * (2 * m - 2) + theta * (m - 1) * (m - 1)) / (90 * m * m);
  }
}

function calculatePileSettlement(
  load: number,
  length: number,
  diameter: number,
  E_pile: number = 30000000, // Concrete modulus (Pa)
  layers: any[]
): number {
  // Simplified settlement calculation using load transfer
  const area = Math.PI * diameter * diameter / 4;
  
  // Elastic compression of pile
  const pile_compression = (load * length) / (E_pile * area);
  
  // Soil compression (simplified)
  const average_E_soil = layers.reduce((sum, layer) => {
    const E_soil = layer.frictionAngle > 0 ? 10000 + layer.frictionAngle * 500 : 5000;
    return sum + E_soil;
  }, 0) / layers.length;
  
  const soil_compression = (load * diameter) / (average_E_soil * area * 4); // Simplified influence factor
  
  return (pile_compression + soil_compression) * 1000; // Convert to mm
}

function generateChartData(
  params: PileFoundationRequest['parameters'],
  results: any
): PileFoundationResponse['chart_data'] {
  // Capacity vs depth chart
  const capacity_depth = [];
  for (let depth = 5; depth <= params.pileLength; depth += 2) {
    let total_shaft = 0;
    let cumulative_stress = 0;
    
    for (const layer of params.selectedLayers) {
      if (layer.fromDepth < depth) {
        const layer_length = Math.min(depth, layer.toDepth) - layer.fromDepth;
        cumulative_stress += layer.unitWeight * layer_length;
        
        if (layer.cohesion > 0) {
          const alpha_result = calculateAlphaMethod(layer.cohesion, params.pileDiameter, layer_length);
          total_shaft += alpha_result.shaft_capacity;
        } else {
          const beta_result = calculateBetaMethod(layer.frictionAngle, cumulative_stress, params.pileDiameter, layer_length);
          total_shaft += beta_result.shaft_capacity;
        }
      }
    }
    
    capacity_depth.push({ depth, capacity: total_shaft });
  }

  // Load-settlement curve
  const load_settlement = [];
  const maxLoad = results.ultimate_capacity;
  for (let load = 0; load <= maxLoad; load += maxLoad / 10) {
    const settlement = calculatePileSettlement(load, params.pileLength, params.pileDiameter, 30000000, params.selectedLayers);
    load_settlement.push({ load, settlement: settlement * (load / maxLoad) });
  }

  // Shaft stress distribution
  const shaft_distribution = [];
  let cumulative_stress = 0;
  for (const layer of params.selectedLayers) {
    const mid_depth = (layer.fromDepth + layer.toDepth) / 2;
    cumulative_stress += layer.unitWeight * (layer.toDepth - layer.fromDepth);
    
    let shaft_stress = 0;
    if (layer.cohesion > 0) {
      const alpha_result = calculateAlphaMethod(layer.cohesion, params.pileDiameter, 1);
      shaft_stress = alpha_result.alpha * layer.cohesion;
    } else {
      const beta_result = calculateBetaMethod(layer.frictionAngle, cumulative_stress, params.pileDiameter, 1);
      shaft_stress = beta_result.beta * cumulative_stress;
    }
    
    shaft_distribution.push({ depth: mid_depth, shaft_stress });
  }

  return { capacity_depth, load_settlement, shaft_distribution };
}

async function calculatePileFoundation(request: PileFoundationRequest): Promise<PileFoundationResponse> {
  const { parameters } = request;
  
  if (parameters.selectedLayers.length === 0) {
    throw new Error('No soil layers selected for analysis');
  }

  let total_shaft_capacity = 0;
  let cumulative_stress = 0;
  const layer_analysis = [];
  
  // Calculate shaft capacity for each layer
  for (const layer of parameters.selectedLayers) {
    const layer_length = Math.min(parameters.pileLength, layer.toDepth) - layer.fromDepth;
    if (layer_length <= 0) continue;
    
    cumulative_stress += layer.unitWeight * layer_length;
    let shaft_contribution = 0;
    
    if (layer.cohesion > 0) {
      // Use alpha method for cohesive soils
      const alpha_result = calculateAlphaMethod(layer.cohesion, parameters.pileDiameter, layer_length);
      shaft_contribution = alpha_result.shaft_capacity;
    } else {
      // Use beta method for cohesionless soils
      const beta_result = calculateBetaMethod(layer.frictionAngle, cumulative_stress, parameters.pileDiameter, layer_length);
      shaft_contribution = beta_result.shaft_capacity;
    }
    
    total_shaft_capacity += shaft_contribution;
    
    layer_analysis.push({
      from_depth: layer.fromDepth,
      to_depth: layer.toDepth,
      soil_type: layer.soilType,
      shaft_contribution,
      is_critical: false // Will be determined later
    });
  }

  // Calculate base capacity using the bottom layer properties
  const bottom_layer = parameters.selectedLayers.find(l => l.toDepth >= parameters.pileLength) || 
                       parameters.selectedLayers[parameters.selectedLayers.length - 1];
  
  const tip_stress = cumulative_stress;
  const base_capacity = calculateBaseCapacity(
    bottom_layer.cohesion,
    bottom_layer.frictionAngle,
    tip_stress,
    parameters.pileDiameter
  );

  // Total ultimate capacity
  let ultimate_capacity = total_shaft_capacity + base_capacity;
  let group_efficiency = 1.0;

  // Apply group efficiency if pile group
  if (parameters.subType === 'pile_group') {
    group_efficiency = calculateGroupEfficiency(4, 2.5 * parameters.pileDiameter, parameters.pileDiameter); // Assumed values
    ultimate_capacity *= group_efficiency;
  }

  const allowable_load = ultimate_capacity / parameters.factorOfSafety;

  // Settlement calculation
  const total_settlement = calculatePileSettlement(
    allowable_load,
    parameters.pileLength,
    parameters.pileDiameter,
    30000000,
    parameters.selectedLayers
  );

  // Negative skin friction (if groundwater considerations)
  let negative_skin_friction = 0;
  if (parameters.groundwaterLevel && parameters.groundwaterLevel > 0) {
    // Simplified calculation for negative skin friction
    const affected_length = Math.min(parameters.groundwaterLevel, parameters.pileLength);
    negative_skin_friction = 0.1 * total_shaft_capacity * (affected_length / parameters.pileLength);
  }

  // Determine critical layer (highest contribution)
  const critical_layer_analysis = layer_analysis.reduce((prev, curr) => 
    prev.shaft_contribution > curr.shaft_contribution ? prev : curr
  );
  critical_layer_analysis.is_critical = true;

  // Warnings and recommendations
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (total_settlement > 25) {
    warnings.push('Settlement exceeds typical limits - consider larger diameter or longer piles');
  }
  if (group_efficiency < 0.8) {
    warnings.push('Low group efficiency - consider increasing pile spacing');
  }
  if (negative_skin_friction > ultimate_capacity * 0.2) {
    warnings.push('Significant negative skin friction expected - account for in design');
  }

  recommendations.push(`Use ${parameters.designStandard.toUpperCase()} standards for detailed design`);
  recommendations.push('Perform pile load test to verify capacity assumptions');
  recommendations.push('Monitor settlement during construction');

  if (parameters.subType === 'pile_group') {
    recommendations.push('Consider cap thickness and connection details for group action');
  }

  const results = {
    status: 'success',
    ultimate_capacity,
    allowable_load,
    shaft_capacity: total_shaft_capacity,
    base_capacity,
    group_efficiency: parameters.subType === 'pile_group' ? group_efficiency : undefined,
    total_settlement,
    negative_skin_friction: negative_skin_friction > 0 ? negative_skin_friction : undefined,
    controlling_limit_state: total_settlement > 25 ? 'Settlement' : 'Capacity',
    method_used: 'Combined α-β method',
    critical_layer: `${critical_layer_analysis.soil_type} (${critical_layer_analysis.from_depth}m - ${critical_layer_analysis.to_depth}m)`,
    recommendations,
    warnings,
    layer_analysis,
    calculation_details: {
      shaft_method: 'alpha-beta',
      base_method: 'bearing_capacity',
      group_efficiency_method: parameters.subType === 'pile_group' ? 'converse_labarre' : null,
      tip_stress: tip_stress,
      bottom_layer: bottom_layer
    }
  } as Partial<PileFoundationResponse>;

  results.chart_data = generateChartData(parameters, results);

  return results as PileFoundationResponse;
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

    const request: PileFoundationRequest = await req.json();

    if (!request.project_id || !request.parameters) {
      throw new Error('Missing required fields: project_id and parameters are required');
    }

    console.log('Processing pile foundation calculation for project:', request.project_id);

    const results = await calculatePileFoundation(request);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in compute-foundation-pile function:', error);
    
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error.message,
        message: 'Failed to compute pile foundation analysis'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
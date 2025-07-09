import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TypeScript interfaces
interface SPTRawData {
  depth: number;
  blow_counts: number[];
  hammer_weight?: number;
  drop_height?: number;
  rod_length?: number;
  borehole_diameter?: number;
  overburden_pressure?: number;
}

interface SPTMetadata {
  units?: 'metric' | 'imperial';
  correction_factors?: {
    hammer_efficiency?: number;
    borehole_diameter?: number;
    rod_length?: number;
    overburden?: number;
  };
  site_conditions?: string;
}

interface SPTRequest {
  test_id: string;
  raw_data: SPTRawData[];
  metadata?: SPTMetadata;
}

interface SPTComputedData {
  depth: number;
  n_raw: number;
  n60: number;
  n1_60: number;
  relative_density: number;
  soil_classification: string;
  friction_angle: number;
  unit_weight: number;
}

interface SPTResponse {
  success: boolean;
  computed_data: SPTComputedData[];
  visualization_data: {
    depth_vs_n60: Array<{x: number, y: number}>;
    depth_vs_relative_density: Array<{x: number, y: number}>;
  };
  classifications: string[];
  warnings: string[];
  reference_standards: string[];
}

function calculateSPTParameters(rawData: SPTRawData[], metadata?: SPTMetadata): SPTResponse {
  const computedData: SPTComputedData[] = [];
  const warnings: string[] = [];
  const classifications: string[] = [];
  
  rawData.forEach(data => {
    // Calculate raw N value (last 12 inches of 18-inch penetration)
    const nRaw = data.blow_counts.slice(-2).reduce((sum, count) => sum + count, 0);
    
    // Apply corrections for N60
    const hammerEfficiency = metadata?.correction_factors?.hammer_efficiency || 0.6;
    const boreholeCorrection = metadata?.correction_factors?.borehole_diameter || 1.0;
    const rodCorrection = metadata?.correction_factors?.rod_length || 1.0;
    
    const n60 = nRaw * hammerEfficiency * boreholeCorrection * rodCorrection;
    
    // Overburden correction
    const overburdenPressure = data.overburden_pressure || (data.depth * 19.6); // kN/m²
    const cn = Math.min(1.7, Math.sqrt(100 / overburdenPressure));
    const n1_60 = n60 * cn;
    
    // Relative density (Skempton, 1986)
    const relativeDensity = Math.sqrt(n1_60 / 60) * 100;
    
    // Soil classification based on N60
    let soilClassification = '';
    if (n60 < 4) soilClassification = 'Very Loose Sand';
    else if (n60 < 10) soilClassification = 'Loose Sand';
    else if (n60 < 30) soilClassification = 'Medium Dense Sand';
    else if (n60 < 50) soilClassification = 'Dense Sand';
    else soilClassification = 'Very Dense Sand';
    
    // Friction angle (Peck et al., 1974)
    const frictionAngle = Math.sqrt(20 * n1_60) + 20;
    
    // Unit weight estimation
    const unitWeight = 14 + (relativeDensity / 100) * 6; // kN/m³
    
    computedData.push({
      depth: data.depth,
      n_raw: nRaw,
      n60,
      n1_60,
      relative_density: relativeDensity,
      soil_classification: soilClassification,
      friction_angle: frictionAngle,
      unit_weight: unitWeight
    });
    
    // Add classifications and warnings
    if (!classifications.includes(soilClassification)) {
      classifications.push(soilClassification);
    }
    
    if (n60 < 4) {
      warnings.push(`Very loose conditions at ${data.depth}m depth - consider densification`);
    }
    if (relativeDensity > 100) {
      warnings.push(`Relative density exceeds 100% at ${data.depth}m - check calculations`);
    }
  });
  
  // Prepare visualization data
  const depthVsN60 = computedData.map(d => ({ x: d.n60, y: d.depth }));
  const depthVsRelativeDensity = computedData.map(d => ({ x: d.relative_density, y: d.depth }));
  
  return {
    success: true,
    computed_data: computedData,
    visualization_data: {
      depth_vs_n60: depthVsN60,
      depth_vs_relative_density: depthVsRelativeDensity
    },
    classifications,
    warnings,
    reference_standards: ['ASTM D1586', 'BS EN ISO 22476-3', 'Skempton (1986)', 'Peck et al. (1974)']
  };
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const requestData: SPTRequest = await req.json();
    
    if (!requestData.test_id || !requestData.raw_data) {
      return new Response(JSON.stringify({ error: 'Missing required fields: test_id and raw_data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing SPT computation for test:', requestData.test_id);
    
    const result = calculateSPTParameters(requestData.raw_data, requestData.metadata);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in SPT computation:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
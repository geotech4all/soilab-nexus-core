import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TypeScript interfaces
interface CPTRawData {
  depth: number;
  qc: number; // Cone resistance (MPa)
  fs: number; // Sleeve friction (kPa)
  u2?: number; // Pore pressure (kPa)
}

interface CPTMetadata {
  units?: 'metric' | 'imperial';
  cone_area?: number;
  sleeve_area?: number;
  water_table_depth?: number;
  unit_weight_above_wt?: number;
  unit_weight_below_wt?: number;
}

interface CPTRequest {
  test_id: string;
  raw_data: CPTRawData[];
  metadata?: CPTMetadata;
}

interface CPTComputedData {
  depth: number;
  qc: number;
  fs: number;
  friction_ratio: number;
  qt: number; // Corrected cone resistance
  soil_behavior_type: string;
  ic: number; // Soil behavior type index
  friction_angle: number;
  undrained_shear_strength?: number;
  relative_density?: number;
}

interface CPTResponse {
  success: boolean;
  computed_data: CPTComputedData[];
  visualization_data: {
    depth_vs_qc: Array<{x: number, y: number}>;
    depth_vs_friction_ratio: Array<{x: number, y: number}>;
    qc_vs_friction_ratio: Array<{x: number, y: number, type: string}>;
  };
  classifications: string[];
  warnings: string[];
  reference_standards: string[];
}

function calculateCPTParameters(rawData: CPTRawData[], metadata?: CPTMetadata): CPTResponse {
  const computedData: CPTComputedData[] = [];
  const warnings: string[] = [];
  const classifications: string[] = [];
  
  rawData.forEach(data => {
    // Calculate friction ratio
    const frictionRatio = (data.fs / (data.qc * 1000)) * 100; // Convert qc to kPa for calculation
    
    // Calculate corrected cone resistance (qt)
    const u2 = data.u2 || 0;
    const qt = data.qc + (u2 * (1 - 0.8)) / 1000; // Assuming area ratio = 0.8
    
    // Calculate soil behavior type index (Ic) - Robertson & Wride (1998)
    const qtn = Math.log10(qt); // Normalized cone resistance
    const fr = Math.log10(frictionRatio + 0.1); // Avoid log(0)
    const ic = Math.sqrt((3.47 - qtn)**2 + (1.22 + fr)**2);
    
    // Soil behavior type classification
    let soilBehaviorType = '';
    if (ic < 1.31) soilBehaviorType = 'Dense Sand to Clayey Sand';
    else if (ic < 2.05) soilBehaviorType = 'Sands: Clean Sand to Silty Sand';
    else if (ic < 2.60) soilBehaviorType = 'Sand Mixtures: Silty Sand to Sandy Silt';
    else if (ic < 2.95) soilBehaviorType = 'Silt Mixtures: Clayey Silt to Silty Clay';
    else if (ic < 3.60) soilBehaviorType = 'Clays: Silty Clay to Clay';
    else soilBehaviorType = 'Organic Soils: Peat';
    
    // Friction angle for granular soils (Robertson & Campanella, 1983)
    let frictionAngle = 0;
    if (ic < 2.6) { // Granular soils
      frictionAngle = Math.atan(1/2.68 * (Math.log10(qt) + 0.29)) * 180 / Math.PI + 17.6;
    }
    
    // Undrained shear strength for cohesive soils
    let undrainedShearStrength;
    if (ic > 2.6) { // Cohesive soils
      const nkt = 10 + 7 * Math.sin(frictionAngle * Math.PI / 180); // Cone factor
      undrainedShearStrength = qt / nkt;
    }
    
    // Relative density for sands (Jamiolkowski et al., 2001)
    let relativeDensity;
    if (ic < 2.6) {
      const qc1n = qt / Math.sqrt(data.depth * 20); // Normalized cone resistance
      relativeDensity = -98 + 66 * Math.log10(qc1n);
      relativeDensity = Math.max(0, Math.min(100, relativeDensity));
    }
    
    computedData.push({
      depth: data.depth,
      qc: data.qc,
      fs: data.fs,
      friction_ratio: frictionRatio,
      qt,
      soil_behavior_type: soilBehaviorType,
      ic,
      friction_angle: frictionAngle,
      undrained_shear_strength: undrainedShearStrength,
      relative_density: relativeDensity
    });
    
    // Add classifications and warnings
    if (!classifications.includes(soilBehaviorType)) {
      classifications.push(soilBehaviorType);
    }
    
    if (frictionRatio > 8) {
      warnings.push(`High friction ratio (${frictionRatio.toFixed(1)}%) at ${data.depth}m - check equipment calibration`);
    }
    if (data.qc < 0.5) {
      warnings.push(`Very low cone resistance at ${data.depth}m - possible equipment issues`);
    }
  });
  
  // Prepare visualization data
  const depthVsQc = computedData.map(d => ({ x: d.qc, y: d.depth }));
  const depthVsFrictionRatio = computedData.map(d => ({ x: d.friction_ratio, y: d.depth }));
  const qcVsFrictionRatio = computedData.map(d => ({ 
    x: d.qc, 
    y: d.friction_ratio, 
    type: d.soil_behavior_type 
  }));
  
  return {
    success: true,
    computed_data: computedData,
    visualization_data: {
      depth_vs_qc: depthVsQc,
      depth_vs_friction_ratio: depthVsFrictionRatio,
      qc_vs_friction_ratio: qcVsFrictionRatio
    },
    classifications,
    warnings,
    reference_standards: ['ASTM D5778', 'ISO 22476-1', 'Robertson & Wride (1998)', 'Jamiolkowski et al. (2001)']
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

    const requestData: CPTRequest = await req.json();
    
    if (!requestData.test_id || !requestData.raw_data) {
      return new Response(JSON.stringify({ error: 'Missing required fields: test_id and raw_data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing CPT computation for test:', requestData.test_id);
    
    const result = calculateCPTParameters(requestData.raw_data, requestData.metadata);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in CPT computation:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
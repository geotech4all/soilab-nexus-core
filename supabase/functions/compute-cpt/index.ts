import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// TypeScript interfaces
interface CPTDataPoint {
  depth: number;
  qc: number; // Cone resistance (MPa)
  fs: number; // Sleeve friction (kPa)
  u2?: number; // Pore pressure (kPa)
}

interface CPTRequest {
  test_id: string;
  data: CPTDataPoint[];
  corrections?: {
    cone_area?: number;
    sleeve_area?: number;
    water_table_depth?: number;
    unit_weight_above_wt?: number;
    unit_weight_below_wt?: number;
  };
  units?: 'metric' | 'imperial';
  store?: boolean;
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
  status: 'success' | 'error';
  message?: string;
  computed_data?: CPTComputedData[];
  chart_data?: {
    depth_vs_qc: Array<{x: number, y: number}>;
    depth_vs_friction_ratio: Array<{x: number, y: number}>;
    qc_vs_friction_ratio: Array<{x: number, y: number, type: string}>;
  };
  interpretation?: string;
  standard?: string;
  classifications?: string[];
  warnings?: string[];
}

function validateCPTData(data: CPTDataPoint[]): string | null {
  if (!Array.isArray(data) || data.length === 0) {
    return 'Data array is required and cannot be empty';
  }

  for (const point of data) {
    if (!point.depth || point.depth <= 0) {
      return 'Depth is required and must be greater than 0';
    }
    if (!point.qc || point.qc <= 0) {
      return 'Cone resistance (qc) is required and must be greater than 0';
    }
    if (!point.fs || point.fs < 0) {
      return 'Sleeve friction (fs) is required and must be >= 0';
    }
  }
  
  return null;
}

async function calculateCPTParameters(request: CPTRequest): Promise<CPTResponse> {
  try {
    // Validate input data
    const validationError = validateCPTData(request.data);
    if (validationError) {
      return {
        status: 'error',
        message: validationError
      };
    }

    const computedData: CPTComputedData[] = [];
    const warnings: string[] = [];
    const classifications: string[] = [];
    
    request.data.forEach(dataPoint => {
      // Calculate friction ratio
      const frictionRatio = (dataPoint.fs / (dataPoint.qc * 1000)) * 100; // Convert qc to kPa for calculation
      
      // Calculate corrected cone resistance (qt)
      const u2 = dataPoint.u2 || 0;
      const qt = dataPoint.qc + (u2 * (1 - 0.8)) / 1000; // Assuming area ratio = 0.8
      
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
        const qc1n = qt / Math.sqrt(dataPoint.depth * 20); // Normalized cone resistance
        relativeDensity = -98 + 66 * Math.log10(qc1n);
        relativeDensity = Math.max(0, Math.min(100, relativeDensity));
      }
      
      computedData.push({
        depth: dataPoint.depth,
        qc: dataPoint.qc,
        fs: dataPoint.fs,
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
        warnings.push(`High friction ratio (${frictionRatio.toFixed(1)}%) at ${dataPoint.depth}m - check equipment calibration`);
      }
      if (dataPoint.qc < 0.5) {
        warnings.push(`Very low cone resistance at ${dataPoint.depth}m - possible equipment issues`);
      }
    });

    // Store results in database if requested
    if (request.store && request.test_id) {
      await supabase.from('test_results').insert({
        test_id: request.test_id,
        computed_data: computedData,
        raw_data: request.data,
        metadata: {
          corrections: request.corrections,
          units: request.units,
          warnings,
          classifications
        }
      });
    }
    
    // Prepare chart data
    const depthVsQc = computedData.map(d => ({ x: d.qc, y: d.depth }));
    const depthVsFrictionRatio = computedData.map(d => ({ x: d.friction_ratio, y: d.depth }));
    const qcVsFrictionRatio = computedData.map(d => ({ 
      x: d.qc, 
      y: d.friction_ratio, 
      type: d.soil_behavior_type 
    }));

    // Overall interpretation
    const avgIc = computedData.reduce((sum, d) => sum + d.ic, 0) / computedData.length;
    let interpretation = '';
    if (avgIc < 2.05) interpretation = 'Predominantly sandy soils - good for foundations';
    else if (avgIc < 2.95) interpretation = 'Mixed soil conditions - requires careful analysis';
    else interpretation = 'Predominantly clayey soils - consider settlement analysis';
    
    return {
      status: 'success',
      computed_data: computedData,
      chart_data: {
        depth_vs_qc: depthVsQc,
        depth_vs_friction_ratio: depthVsFrictionRatio,
        qc_vs_friction_ratio: qcVsFrictionRatio
      },
      interpretation,
      standard: 'ASTM D5778',
      classifications,
      warnings
    };

  } catch (error) {
    console.error('Error in CPT computation:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Method not allowed' 
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const requestData: CPTRequest = await req.json();
    
    if (!requestData.test_id || !requestData.data) {
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Missing required fields: test_id and data' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing CPT computation for test:', requestData.test_id);
    
    const result = await calculateCPTParameters(requestData);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in CPT computation:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
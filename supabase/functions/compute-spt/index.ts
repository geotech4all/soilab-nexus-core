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
interface SPTDataPoint {
  depth: number;
  N1?: number;
  N2?: number;
  N3?: number;
  blow_counts?: number[];
}

interface SPTRequest {
  test_id: string;
  data: SPTDataPoint[];
  corrections?: {
    CN?: number;
    hammer_efficiency?: number;
    borehole_diameter?: number;
    rod_length?: number;
  };
  units?: 'metric' | 'imperial';
  store?: boolean;
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
  status: 'success' | 'error';
  message?: string;
  computed_data?: SPTComputedData[];
  chart_data?: {
    depth_vs_n60: Array<{x: number, y: number}>;
    depth_vs_relative_density: Array<{x: number, y: number}>;
  };
  interpretation?: string;
  standard?: string;
  classifications?: string[];
  warnings?: string[];
}

function validateSPTData(data: SPTDataPoint[]): string | null {
  if (!Array.isArray(data) || data.length === 0) {
    return 'Data array is required and cannot be empty';
  }

  for (const point of data) {
    if (!point.depth || point.depth <= 0) {
      return 'Depth is required and must be greater than 0';
    }
    
    // Check if we have blow counts or individual N values
    const hasBlowCounts = point.blow_counts && Array.isArray(point.blow_counts) && point.blow_counts.length >= 2;
    const hasNValues = point.N1 !== undefined && point.N2 !== undefined && point.N3 !== undefined;
    
    if (!hasBlowCounts && !hasNValues) {
      return 'Each data point must have either blow_counts array or N1, N2, N3 values';
    }
  }
  
  return null;
}

async function calculateSPTParameters(request: SPTRequest): Promise<SPTResponse> {
  try {
    // Validate input data
    const validationError = validateSPTData(request.data);
    if (validationError) {
      return {
        status: 'error',
        message: validationError
      };
    }

    const computedData: SPTComputedData[] = [];
    const warnings: string[] = [];
    const classifications: string[] = [];
    
    request.data.forEach(dataPoint => {
      // Calculate raw N value
      let nRaw: number;
      if (dataPoint.blow_counts) {
        // Last 12 inches of 18-inch penetration (N2 + N3)
        nRaw = dataPoint.blow_counts.slice(-2).reduce((sum, count) => sum + count, 0);
      } else {
        // N2 + N3 (standard practice)
        nRaw = (dataPoint.N2 || 0) + (dataPoint.N3 || 0);
      }
      
      // Apply corrections for N60
      const hammerEfficiency = request.corrections?.hammer_efficiency || 0.6;
      const boreholeCorrection = request.corrections?.borehole_diameter || 1.0;
      const rodCorrection = request.corrections?.rod_length || 1.0;
      
      const n60 = nRaw * hammerEfficiency * boreholeCorrection * rodCorrection;
      
      // Overburden correction
      const overburdenPressure = dataPoint.depth * 19.6; // Assuming unit weight of 20 kN/m³
      const cn = request.corrections?.CN || Math.min(1.7, Math.sqrt(100 / overburdenPressure));
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
        depth: dataPoint.depth,
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
        warnings.push(`Very loose conditions at ${dataPoint.depth}m depth - consider densification`);
      }
      if (relativeDensity > 100) {
        warnings.push(`Relative density exceeds 100% at ${dataPoint.depth}m - check calculations`);
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
    const depthVsN60 = computedData.map(d => ({ x: d.n60, y: d.depth }));
    const depthVsRelativeDensity = computedData.map(d => ({ x: d.relative_density, y: d.depth }));
    
    // Overall interpretation
    const avgN60 = computedData.reduce((sum, d) => sum + d.n60, 0) / computedData.length;
    let interpretation = '';
    if (avgN60 < 4) interpretation = 'Very Loose Sand - requires densification';
    else if (avgN60 < 10) interpretation = 'Loose Sand - moderate bearing capacity';
    else if (avgN60 < 30) interpretation = 'Medium Dense Sand - good bearing capacity';
    else if (avgN60 < 50) interpretation = 'Dense Sand - excellent bearing capacity';
    else interpretation = 'Very Dense Sand - excellent bearing capacity';
    
    return {
      status: 'success',
      computed_data: computedData,
      chart_data: {
        depth_vs_n60: depthVsN60,
        depth_vs_relative_density: depthVsRelativeDensity
      },
      interpretation,
      standard: 'ASTM D1586',
      classifications,
      warnings
    };

  } catch (error) {
    console.error('Error in SPT computation:', error);
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

    const requestData: SPTRequest = await req.json();
    
    if (!requestData.test_id || !requestData.data) {
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Missing required fields: test_id and data' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing SPT computation for test:', requestData.test_id);
    
    const result = await calculateSPTParameters(requestData);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in SPT computation:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
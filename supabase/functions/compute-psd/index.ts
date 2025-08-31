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
interface PSDDataPoint {
  sieve_size: number; // mm
  percent_passing: number; // %
}

interface PSDRequest {
  test_id: string;
  data: PSDDataPoint[];
  corrections?: {
    moisture_correction?: number;
    temperature_correction?: number;
  };
  units?: 'metric' | 'imperial';
  store?: boolean;
}

interface PSDComputedData {
  d10: number;
  d30: number;
  d60: number;
  d85: number;
  coefficient_of_uniformity: number;
  coefficient_of_curvature: number;
  gravel_percent: number;
  sand_percent: number;
  fines_percent: number;
  uscs_classification: string;
  aashto_classification: string;
  soil_description: string;
  gradation: string;
  effective_size: number;
}

interface PSDResponse {
  status: 'success' | 'error';
  message?: string;
  computed_data?: PSDComputedData;
  chart_data?: {
    grain_size_curve: Array<{x: number, y: number}>;
  };
  interpretation?: string;
  standard?: string;
  classifications?: string[];
  warnings?: string[];
}

function interpolatePercentPassing(sieveSizes: number[], percentPassing: number[], targetSize: number): number {
  // Linear interpolation in log space
  for (let i = 0; i < sieveSizes.length - 1; i++) {
    if (targetSize >= sieveSizes[i+1] && targetSize <= sieveSizes[i]) {
      const x1 = Math.log10(sieveSizes[i+1]);
      const x2 = Math.log10(sieveSizes[i]);
      const y1 = percentPassing[i+1];
      const y2 = percentPassing[i];
      const x = Math.log10(targetSize);
      
      return y1 + (y2 - y1) * (x - x1) / (x2 - x1);
    }
  }
  
  // Extrapolation
  if (targetSize > sieveSizes[0]) return percentPassing[0];
  if (targetSize < sieveSizes[sieveSizes.length - 1]) return percentPassing[percentPassing.length - 1];
  
  return 0;
}

function findDiameter(sieveSizes: number[], percentPassing: number[], targetPercent: number): number {
  // Find diameter corresponding to target percent passing
  for (let i = 0; i < percentPassing.length - 1; i++) {
    if (targetPercent >= percentPassing[i+1] && targetPercent <= percentPassing[i]) {
      const y1 = percentPassing[i+1];
      const y2 = percentPassing[i];
      const x1 = Math.log10(sieveSizes[i+1]);
      const x2 = Math.log10(sieveSizes[i]);
      const y = targetPercent;
      
      const x = x1 + (x2 - x1) * (y - y1) / (y2 - y1);
      return Math.pow(10, x);
    }
  }
  
  return 0;
}

function getUSCSClassification(gravel: number, sand: number, fines: number, cu: number, cc: number): string {
  if (fines > 50) {
    // Fine-grained soil - would need Atterberg limits for full classification
    return 'ML/CL'; // Placeholder - needs plasticity data
  } else if (gravel > sand) {
    // Gravel
    if (fines < 5) {
      if (cu >= 4 && cc >= 1 && cc <= 3) return 'GW'; // Well-graded gravel
      else return 'GP'; // Poorly graded gravel
    } else if (fines > 12) {
      return 'GM/GC'; // Gravel with fines - needs plasticity data
    } else {
      return 'GW-GM/GP-GM'; // Borderline gravel
    }
  } else {
    // Sand
    if (fines < 5) {
      if (cu >= 6 && cc >= 1 && cc <= 3) return 'SW'; // Well-graded sand
      else return 'SP'; // Poorly graded sand
    } else if (fines > 12) {
      return 'SM/SC'; // Sand with fines - needs plasticity data
    } else {
      return 'SW-SM/SP-SM'; // Borderline sand
    }
  }
}

function getAASHTOClassification(gravel: number, sand: number, fines: number): string {
  if (fines <= 35) {
    if (gravel > sand) {
      return 'A-1-a'; // Stone fragments, gravel, and sand
    } else {
      return 'A-1-b'; // Stone fragments, gravel, and sand
    }
  } else if (fines <= 50) {
    return 'A-2'; // Silty or clayey gravel and sand
  } else {
    return 'A-4/A-5/A-6/A-7'; // Silt-clay materials - needs plasticity data
  }
}

function getGradationDescription(cu: number, cc: number): string {
  if (cu >= 4 && cc >= 1 && cc <= 3) {
    return 'Well-graded';
  } else if (cu < 4) {
    return 'Uniformly graded';
  } else {
    return 'Poorly graded';
  }
}

function validatePSDData(data: PSDDataPoint[]): string | null {
  if (!Array.isArray(data) || data.length === 0) {
    return 'Data array is required and cannot be empty';
  }

  for (const point of data) {
    if (!point.sieve_size || point.sieve_size <= 0) {
      return 'Sieve size is required and must be greater than 0';
    }
    if (point.percent_passing < 0 || point.percent_passing > 100) {
      return 'Percent passing must be between 0 and 100';
    }
  }

  return null;
}

async function calculatePSDParameters(request: PSDRequest): Promise<PSDResponse> {
  try {
    // Validate input data
    const validationError = validatePSDData(request.data);
    if (validationError) {
      return {
        status: 'error',
        message: validationError
      };
    }

    const warnings: string[] = [];
    const classifications: string[] = [];

    // Sort data by decreasing sieve size
    const sortedData = [...request.data].sort((a, b) => b.sieve_size - a.sieve_size);
    const sieveSizes = sortedData.map(d => d.sieve_size);
    const percentPassing = sortedData.map(d => d.percent_passing);

    // Calculate characteristic diameters
    const d10 = findDiameter(sieveSizes, percentPassing, 10);
    const d30 = findDiameter(sieveSizes, percentPassing, 30);
    const d60 = findDiameter(sieveSizes, percentPassing, 60);
    const d85 = findDiameter(sieveSizes, percentPassing, 85);

    // Calculate coefficients
    const cu = d60 > 0 ? d60 / d10 : 0; // Coefficient of uniformity
    const cc = (d10 > 0 && d60 > 0) ? (d30 * d30) / (d60 * d10) : 0; // Coefficient of curvature

    // Calculate fractions
    const gravel = 100 - interpolatePercentPassing(sieveSizes, percentPassing, 4.75);
    const sand = interpolatePercentPassing(sieveSizes, percentPassing, 4.75) - 
                 interpolatePercentPassing(sieveSizes, percentPassing, 0.075);
    const fines = interpolatePercentPassing(sieveSizes, percentPassing, 0.075);

    // Classifications
    const uscsClassification = getUSCSClassification(gravel, sand, fines, cu, cc);
    const aashtoClassification = getAASHTOClassification(gravel, sand, fines);
    const gradation = getGradationDescription(cu, cc);

    // Soil description
    let soilDescription = '';
    if (gravel > 50) soilDescription = 'Gravel';
    else if (sand > 50) soilDescription = 'Sand';
    else soilDescription = 'Fine-grained soil';

    if (fines > 12) soilDescription += ' with fines';
    soilDescription += ` (${gradation.toLowerCase()})`;

    // Add warnings
    if (d10 === 0) warnings.push('D10 could not be determined - possibly gap-graded soil');
    if (cu > 100) warnings.push('Very high coefficient of uniformity - check gradation curve');
    if (fines > 12 && fines < 50) warnings.push('Intermediate fines content - dual classification may apply');

    classifications.push(uscsClassification, aashtoClassification);

    const computedData: PSDComputedData = {
      d10,
      d30,
      d60,
      d85,
      coefficient_of_uniformity: cu,
      coefficient_of_curvature: cc,
      gravel_percent: gravel,
      sand_percent: sand,
      fines_percent: fines,
      uscs_classification: uscsClassification,
      aashto_classification: aashtoClassification,
      soil_description: soilDescription,
      gradation,
      effective_size: d10
    };

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
    const grainSizeCurve = sortedData.map(d => ({
      x: d.sieve_size,
      y: d.percent_passing
    }));

    // Overall interpretation
    let interpretation = '';
    if (fines < 5) {
      interpretation = 'Clean granular soil - excellent drainage, good for foundations';
    } else if (fines < 12) {
      interpretation = 'Granular soil with some fines - good engineering properties';
    } else if (fines < 50) {
      interpretation = 'Mixed soil - engineering properties depend on fines plasticity';
    } else {
      interpretation = 'Fine-grained soil - plasticity characteristics control behavior';
    }

    return {
      status: 'success',
      computed_data: computedData,
      chart_data: {
        grain_size_curve: grainSizeCurve
      },
      interpretation,
      standard: 'ASTM D6913',
      classifications,
      warnings
    };

  } catch (error) {
    console.error('Error in PSD computation:', error);
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

    const requestData: PSDRequest = await req.json();
    
    if (!requestData.test_id || !requestData.data) {
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Missing required fields: test_id and data' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing PSD computation for test:', requestData.test_id);
    
    const result = await calculatePSDParameters(requestData);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in PSD computation:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
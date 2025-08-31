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

// TypeScript interfaces for standardized format
interface AtterbergDataPoint {
  liquid_limit?: number;
  plastic_limit?: number;
  shrinkage_limit?: number;
  // For liquid limit test data
  blow_counts?: number[];
  moisture_contents?: number[];
}

interface AtterbergRequest {
  test_id: string;
  data: AtterbergDataPoint;
  corrections?: {
    temperature_correction?: number;
    humidity_correction?: number;
  };
  units?: 'metric' | 'imperial';
  store?: boolean;
}

interface AtterbergComputedData {
  liquid_limit: number;
  plastic_limit: number;
  plasticity_index: number;
  shrinkage_limit?: number;
  uscs_classification: string;
  aashto_classification: string;
  soil_description: string;
  liquidity_index?: number;
  consistency_index?: number;
  activity?: number;
}

interface AtterbergResponse {
  status: 'success' | 'error';
  message?: string;
  computed_data?: AtterbergComputedData;
  chart_data?: {
    plasticity_chart: Array<{x: number, y: number, classification: string}>;
    casagrande_chart: Array<{x: number, y: number}>;
    liquid_limit_curve?: Array<{x: number, y: number}>;
  };
  interpretation?: string;
  standard?: string;
  classifications?: string[];
  warnings?: string[];
}

function validateAtterbergData(data: AtterbergDataPoint): string | null {
  // Check if we have at least LL and PL or raw test data
  const hasDirectValues = data.liquid_limit !== undefined && data.plastic_limit !== undefined;
  const hasTestData = data.blow_counts && data.moisture_contents && data.plastic_limit !== undefined;
  
  if (!hasDirectValues && !hasTestData) {
    return 'Either liquid_limit and plastic_limit values or liquid limit test data with plastic_limit are required';
  }
  
  if (data.blow_counts && data.moisture_contents) {
    if (data.blow_counts.length !== data.moisture_contents.length) {
      return 'Blow counts and moisture contents arrays must have the same length';
    }
    if (data.blow_counts.length < 3) {
      return 'At least 3 data points required for liquid limit determination';
    }
  }
  
  if (data.plastic_limit !== undefined && data.plastic_limit < 0) {
    return 'Plastic limit must be >= 0';
  }
  
  return null;
}
function calculateLiquidLimit(blowCounts: number[], moistureContents: number[]): number {
  if (!blowCounts || !moistureContents || blowCounts.length !== moistureContents.length) {
    throw new Error('Invalid liquid limit test data');
  }
  
  // Linear regression on semi-log plot (log N vs w)
  const n = blowCounts.length;
  let sumLogN = 0, sumW = 0, sumLogNW = 0, sumLogN2 = 0;
  
  for (let i = 0; i < n; i++) {
    const logN = Math.log10(blowCounts[i]);
    sumLogN += logN;
    sumW += moistureContents[i];
    sumLogNW += logN * moistureContents[i];
    sumLogN2 += logN * logN;
  }
  
  const slope = (n * sumLogNW - sumLogN * sumW) / (n * sumLogN2 - sumLogN * sumLogN);
  const intercept = (sumW - slope * sumLogN) / n;
  
  // Liquid limit at 25 blows
  return intercept + slope * Math.log10(25);
}

async function calculateAtterbergParameters(request: AtterbergRequest): Promise<AtterbergResponse> {
  try {
    // Validate input data
    const validationError = validateAtterbergData(request.data);
    if (validationError) {
      return {
        status: 'error',
        message: validationError
      };
    }

    const warnings: string[] = [];
    const classifications: string[] = [];

    // Calculate or use provided liquid limit
    let liquidLimit = request.data.liquid_limit;
    if (!liquidLimit && request.data.blow_counts && request.data.moisture_contents) {
      liquidLimit = calculateLiquidLimit(request.data.blow_counts, request.data.moisture_contents);
    }

    const plasticLimit = request.data.plastic_limit!;
    
    // Calculate plasticity index (PI = LL - PL)
    const plasticityIndex = liquidLimit! - plasticLimit;

    // Classifications using Casagrande chart
    const uscsClassification = getUSCSClassification(liquidLimit!, plasticityIndex);
    const aashtoClassification = getAASHTOClassification(liquidLimit!, plasticityIndex);
    const soilDescription = getSoilDescription(uscsClassification, plasticityIndex);

    // Additional indices if available
    let liquidityIndex, consistencyIndex, activity;
    if (request.data.shrinkage_limit) {
      // Activity approximation
      if (plasticityIndex > 0) {
        activity = plasticityIndex / 20; // Rough approximation without clay content
      }
    }

    // Add warnings
    if (plasticityIndex < 0) {
      warnings.push('Plasticity index is negative - check test procedure');
    }
    if (liquidLimit! > 100) {
      warnings.push('Liquid limit exceeds 100% - verify test results');
    }
    if (plasticityIndex > 50) {
      warnings.push('Very high plasticity - potential for significant volume change');
    }

    classifications.push(uscsClassification, aashtoClassification);

    const computedData: AtterbergComputedData = {
      liquid_limit: liquidLimit!,
      plastic_limit: plasticLimit,
      plasticity_index: plasticityIndex,
      shrinkage_limit: request.data.shrinkage_limit,
      uscs_classification: uscsClassification,
      aashto_classification: aashtoClassification,
      soil_description: soilDescription,
      liquidity_index: liquidityIndex,
      consistency_index: consistencyIndex,
      activity: activity
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

    // Prepare chart data for Casagrande A-line chart
    const plasticityChart = [{
      x: liquidLimit!,
      y: plasticityIndex,
      classification: uscsClassification
    }];

    // Casagrande A-line for reference (A-line: PI = 0.73(LL - 20))
    const casagrandeChart = [];
    for (let ll = 20; ll <= 100; ll += 10) {
      casagrandeChart.push({
        x: ll,
        y: 0.73 * (ll - 20)
      });
    }

    // Liquid limit flow curve if test data available
    let liquidLimitCurve;
    if (request.data.blow_counts && request.data.moisture_contents) {
      liquidLimitCurve = request.data.blow_counts.map((n, i) => ({
        x: n,
        y: request.data.moisture_contents![i]
      }));
    }

    // Overall interpretation
    let interpretation = '';
    if (plasticityIndex < 7) {
      interpretation = `Low plasticity soil (PI: ${plasticityIndex.toFixed(1)}) - low volume change potential`;
    } else if (plasticityIndex < 17) {
      interpretation = `Medium plasticity soil (PI: ${plasticityIndex.toFixed(1)}) - moderate volume change potential`;
    } else if (plasticityIndex < 35) {
      interpretation = `High plasticity soil (PI: ${plasticityIndex.toFixed(1)}) - significant volume change potential`;
    } else {
      interpretation = `Very high plasticity soil (PI: ${plasticityIndex.toFixed(1)}) - high volume change potential`;
    }

    return {
      status: 'success',
      computed_data: computedData,
      chart_data: {
        plasticity_chart: plasticityChart,
        casagrande_chart: casagrandeChart,
        liquid_limit_curve: liquidLimitCurve
      },
      interpretation,
      standard: 'ASTM D4318',
      classifications,
      warnings
    };

  } catch (error) {
    console.error('Error in Atterberg computation:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
}

function getUSCSClassification(liquidLimit: number, plasticityIndex: number): string {
  if (plasticityIndex < 4) return 'ML'; // Inorganic silts
  if (liquidLimit < 50) {
    if (plasticityIndex > 7 && plasticityIndex > 0.73 * (liquidLimit - 20)) {
      return 'CL'; // Inorganic clays of low plasticity
    } else {
      return 'ML'; // Inorganic silts
    }
  } else {
    if (plasticityIndex > 7 && plasticityIndex > 0.73 * (liquidLimit - 20)) {
      return 'CH'; // Inorganic clays of high plasticity
    } else {
      return 'MH'; // Inorganic silts of high plasticity
    }
  }
}

function getAASHTOClassification(liquidLimit: number, plasticityIndex: number): string {
  if (plasticityIndex <= 10) {
    if (liquidLimit <= 40) return 'A-4';
    else return 'A-5';
  } else if (plasticityIndex <= 20) {
    if (liquidLimit <= 40) return 'A-6';
    else return 'A-7-5';
  } else {
    if (liquidLimit <= 40) return 'A-6';
    else return 'A-7-6';
  }
}

function getSoilDescription(uscsClass: string, plasticityIndex: number): string {
  const descriptions: { [key: string]: string } = {
    'CL': 'Inorganic clays of low plasticity',
    'CH': 'Inorganic clays of high plasticity',
    'ML': 'Inorganic silts and very fine sands',
    'MH': 'Inorganic silts of high plasticity'
  };
  
  let description = descriptions[uscsClass] || 'Unclassified fine-grained soil';
  
  if (plasticityIndex < 7) description += ' (low plasticity)';
  else if (plasticityIndex < 17) description += ' (medium plasticity)';
  else description += ' (high plasticity)';
  
  return description;
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

    const requestData: AtterbergRequest = await req.json();
    
    if (!requestData.test_id || !requestData.data) {
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Missing required fields: test_id and data' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing Atterberg limits computation for test:', requestData.test_id);
    
    const result = await calculateAtterbergParameters(requestData);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in Atterberg computation:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
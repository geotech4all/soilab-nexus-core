import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TypeScript interfaces
interface AtterbergRawData {
  liquid_limit?: number;
  plastic_limit?: number;
  shrinkage_limit?: number;
  natural_moisture_content?: number;
  // For liquid limit test
  blow_counts?: number[];
  moisture_contents?: number[];
}

interface AtterbergMetadata {
  test_method?: 'casagrande' | 'cone_penetrometer';
  specimen_preparation?: string;
  test_conditions?: {
    temperature: number;
    humidity: number;
  };
}

interface AtterbergRequest {
  test_id: string;
  raw_data: AtterbergRawData;
  metadata?: AtterbergMetadata;
}

interface AtterbergComputedData {
  liquid_limit: number;
  plastic_limit: number;
  plasticity_index: number;
  liquidity_index?: number;
  consistency_index?: number;
  shrinkage_limit?: number;
  uscs_classification: string;
  aashto_classification: string;
  soil_description: string;
  activity?: number;
  clay_content?: number;
}

interface AtterbergResponse {
  success: boolean;
  computed_data: AtterbergComputedData;
  visualization_data: {
    plasticity_chart: Array<{x: number, y: number, classification: string}>;
    liquid_limit_flow_curve?: Array<{x: number, y: number}>;
  };
  classifications: string[];
  warnings: string[];
  reference_standards: string[];
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

function calculateAtterbergParameters(rawData: AtterbergRawData, metadata?: AtterbergMetadata): AtterbergResponse {
  const warnings: string[] = [];
  
  // Calculate or use provided liquid limit
  let liquidLimit = rawData.liquid_limit;
  if (!liquidLimit && rawData.blow_counts && rawData.moisture_contents) {
    liquidLimit = calculateLiquidLimit(rawData.blow_counts, rawData.moisture_contents);
  }
  
  if (!liquidLimit || !rawData.plastic_limit) {
    throw new Error('Insufficient data for Atterberg limits calculation');
  }
  
  const plasticLimit = rawData.plastic_limit;
  const plasticityIndex = liquidLimit - plasticLimit;
  
  // Additional indices if natural moisture content is provided
  let liquidityIndex, consistencyIndex;
  if (rawData.natural_moisture_content) {
    liquidityIndex = (rawData.natural_moisture_content - plasticLimit) / plasticityIndex;
    consistencyIndex = (liquidLimit - rawData.natural_moisture_content) / plasticityIndex;
  }
  
  // Classifications
  const uscsClassification = getUSCSClassification(liquidLimit, plasticityIndex);
  const aashtoClassification = getAASHTOClassification(liquidLimit, plasticityIndex);
  const soilDescription = getSoilDescription(uscsClassification, plasticityIndex);
  
  // Activity (if clay content is estimated)
  let activity, clayContent;
  if (plasticityIndex > 0) {
    // Rough estimation: clay content from plasticity index
    clayContent = plasticityIndex * 2; // Approximation
    activity = plasticityIndex / clayContent;
  }
  
  // Warnings
  if (plasticityIndex < 0) {
    warnings.push('Plasticity index is negative - check test procedure');
  }
  if (liquidLimit > 100) {
    warnings.push('Liquid limit exceeds 100% - verify test results');
  }
  if (liquidityIndex && (liquidityIndex < 0 || liquidityIndex > 1.5)) {
    warnings.push('Liquidity index outside normal range - check natural moisture content');
  }
  
  const computedData: AtterbergComputedData = {
    liquid_limit: liquidLimit,
    plastic_limit: plasticLimit,
    plasticity_index: plasticityIndex,
    liquidity_index: liquidityIndex,
    consistency_index: consistencyIndex,
    shrinkage_limit: rawData.shrinkage_limit,
    uscs_classification: uscsClassification,
    aashto_classification: aashtoClassification,
    soil_description: soilDescription,
    activity: activity,
    clay_content: clayContent
  };
  
  // Visualization data
  const plasticityChart = [{
    x: liquidLimit,
    y: plasticityIndex,
    classification: uscsClassification
  }];
  
  let liquidLimitFlowCurve;
  if (rawData.blow_counts && rawData.moisture_contents) {
    liquidLimitFlowCurve = rawData.blow_counts.map((n, i) => ({
      x: n,
      y: rawData.moisture_contents![i]
    }));
  }
  
  return {
    success: true,
    computed_data: computedData,
    visualization_data: {
      plasticity_chart: plasticityChart,
      liquid_limit_flow_curve: liquidLimitFlowCurve
    },
    classifications: [uscsClassification, aashtoClassification],
    warnings,
    reference_standards: ['ASTM D4318', 'BS 1377-2', 'AASHTO T89', 'AASHTO T90']
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

    const requestData: AtterbergRequest = await req.json();
    
    if (!requestData.test_id || !requestData.raw_data) {
      return new Response(JSON.stringify({ error: 'Missing required fields: test_id and raw_data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing Atterberg limits computation for test:', requestData.test_id);
    
    const result = calculateAtterbergParameters(requestData.raw_data, requestData.metadata);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in Atterberg computation:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
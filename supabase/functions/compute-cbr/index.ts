import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TypeScript interfaces
interface CBRRawData {
  penetration: number[]; // mm
  load: number[]; // kN or lbs
  // Specimen data
  initial_moisture_content?: number;
  final_moisture_content?: number;
  dry_density?: number;
  optimum_moisture_content?: number;
  maximum_dry_density?: number;
  surcharge_weight?: number;
  specimen_diameter?: number;
  specimen_height?: number;
}

interface CBRMetadata {
  test_condition?: 'soaked' | 'unsoaked';
  soaking_period?: number; // days
  surcharge_pressure?: number; // kPa
  compaction_method?: 'standard' | 'modified';
  units?: 'metric' | 'imperial';
}

interface CBRRequest {
  test_id: string;
  raw_data: CBRRawData;
  metadata?: CBRMetadata;
}

interface CBRComputedData {
  cbr_at_2_5mm: number;
  cbr_at_5mm: number;
  design_cbr: number;
  corrected_loads: {
    penetration_2_5mm: number;
    penetration_5mm: number;
    load_2_5mm: number;
    load_5mm: number;
  };
  unit_pressure_2_5mm: number;
  unit_pressure_5mm: number;
  bearing_capacity_classification: string;
  subgrade_classification: string;
  recommended_uses: string[];
}

interface CBRResponse {
  success: boolean;
  computed_data: CBRComputedData;
  visualization_data: {
    load_penetration_curve: Array<{x: number, y: number}>;
    corrected_curve?: Array<{x: number, y: number}>;
  };
  classifications: string[];
  warnings: string[];
  reference_standards: string[];
}

function correctLoadPenetrationCurve(penetration: number[], load: number[]): {penetration: number[], load: number[]} {
  // Apply correction for initial curvature as per ASTM D1883
  // Find the point where the curve becomes linear
  const correctedLoad = [...load];
  
  // Simple correction: draw tangent from origin through steepest part of curve
  if (penetration.length >= 3) {
    // Find maximum slope region
    let maxSlope = 0;
    let maxSlopeIndex = 1;
    
    for (let i = 1; i < penetration.length - 1; i++) {
      const slope = (load[i+1] - load[i-1]) / (penetration[i+1] - penetration[i-1]);
      if (slope > maxSlope) {
        maxSlope = slope;
        maxSlopeIndex = i;
      }
    }
    
    // Apply correction
    const correctionSlope = load[maxSlopeIndex] / penetration[maxSlopeIndex];
    for (let i = 0; i < penetration.length; i++) {
      if (penetration[i] < penetration[maxSlopeIndex]) {
        correctedLoad[i] = Math.max(0, load[i] - (correctionSlope * penetration[i] - load[i]));
      }
    }
  }
  
  return { penetration, load: correctedLoad };
}

function interpolateLoad(penetration: number[], load: number[], targetPenetration: number): number {
  for (let i = 0; i < penetration.length - 1; i++) {
    if (targetPenetration >= penetration[i] && targetPenetration <= penetration[i + 1]) {
      const ratio = (targetPenetration - penetration[i]) / (penetration[i + 1] - penetration[i]);
      return load[i] + ratio * (load[i + 1] - load[i]);
    }
  }
  return 0;
}

function getBearingCapacityClassification(cbr: number): string {
  if (cbr < 2) return 'Very Poor';
  if (cbr < 5) return 'Poor';
  if (cbr < 8) return 'Fair';
  if (cbr < 15) return 'Good';
  if (cbr < 30) return 'Very Good';
  return 'Excellent';
}

function getSubgradeClassification(cbr: number): string {
  if (cbr < 3) return 'Very Weak Subgrade';
  if (cbr < 7) return 'Weak Subgrade';
  if (cbr < 20) return 'Medium Subgrade';
  if (cbr < 50) return 'Strong Subgrade';
  return 'Very Strong Subgrade';
}

function getRecommendedUses(cbr: number): string[] {
  const uses: string[] = [];
  
  if (cbr < 2) {
    uses.push('Not suitable for pavement construction');
    uses.push('Requires soil improvement');
  } else if (cbr < 5) {
    uses.push('Light traffic roads with thick pavement');
    uses.push('Parking areas');
  } else if (cbr < 10) {
    uses.push('Residential roads');
    uses.push('Light commercial areas');
  } else if (cbr < 30) {
    uses.push('Heavy traffic roads');
    uses.push('Industrial areas');
    uses.push('Airport taxiways');
  } else {
    uses.push('Heavy duty pavements');
    uses.push('Airport runways');
    uses.push('Container terminals');
  }
  
  return uses;
}

function calculateCBRParameters(rawData: CBRRawData, metadata?: CBRMetadata): CBRResponse {
  const warnings: string[] = [];
  
  if (!rawData.penetration || !rawData.load || rawData.penetration.length !== rawData.load.length) {
    throw new Error('Invalid penetration and load data');
  }
  
  // Apply load-penetration curve correction
  const { penetration, load: correctedLoad } = correctLoadPenetrationCurve(rawData.penetration, rawData.load);
  
  // Interpolate loads at standard penetrations
  const load_2_5mm = interpolateLoad(penetration, correctedLoad, 2.5);
  const load_5mm = interpolateLoad(penetration, correctedLoad, 5.0);
  
  // Standard loads for CBR calculation (ASTM D1883)
  const standardLoad_2_5mm = 13.24; // kN (for 2.5mm penetration)
  const standardLoad_5mm = 19.96; // kN (for 5mm penetration)
  
  // Calculate CBR values
  const cbr_2_5mm = (load_2_5mm / standardLoad_2_5mm) * 100;
  const cbr_5mm = (load_5mm / standardLoad_5mm) * 100;
  
  // Design CBR is typically the larger of the two values
  const designCBR = Math.max(cbr_2_5mm, cbr_5mm);
  
  // Unit pressures (stress)
  const pistonArea = Math.PI * Math.pow(25.4, 2) / 4; // Standard piston area (mm²)
  const unitPressure_2_5mm = (load_2_5mm * 1000) / pistonArea; // kPa
  const unitPressure_5mm = (load_5mm * 1000) / pistonArea; // kPa
  
  // Classifications
  const bearingCapacityClass = getBearingCapacityClassification(designCBR);
  const subgradeClass = getSubgradeClassification(designCBR);
  const recommendedUses = getRecommendedUses(designCBR);
  
  // Warnings
  if (cbr_5mm > cbr_2_5mm * 1.2) {
    warnings.push('CBR at 5mm exceeds 2.5mm value significantly - check curve correction');
  }
  if (designCBR > 100) {
    warnings.push('CBR exceeds 100% - verify test procedure and calculations');
  }
  if (load_2_5mm === 0 || load_5mm === 0) {
    warnings.push('Could not interpolate standard penetration loads - extend test data');
  }
  
  const computedData: CBRComputedData = {
    cbr_at_2_5mm: cbr_2_5mm,
    cbr_at_5mm: cbr_5mm,
    design_cbr: designCBR,
    corrected_loads: {
      penetration_2_5mm: 2.5,
      penetration_5mm: 5.0,
      load_2_5mm: load_2_5mm,
      load_5mm: load_5mm
    },
    unit_pressure_2_5mm: unitPressure_2_5mm,
    unit_pressure_5mm: unitPressure_5mm,
    bearing_capacity_classification: bearingCapacityClass,
    subgrade_classification: subgradeClass,
    recommended_uses: recommendedUses
  };
  
  // Visualization data
  const loadPenetrationCurve = penetration.map((p, i) => ({
    x: p,
    y: rawData.load[i]
  }));
  
  const correctedCurve = penetration.map((p, i) => ({
    x: p,
    y: correctedLoad[i]
  }));
  
  return {
    success: true,
    computed_data: computedData,
    visualization_data: {
      load_penetration_curve: loadPenetrationCurve,
      corrected_curve: correctedCurve
    },
    classifications: [bearingCapacityClass, subgradeClass],
    warnings,
    reference_standards: ['ASTM D1883', 'BS 1377-4', 'AASHTO T193', 'AS 1289.6.1.1']
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

    const requestData: CBRRequest = await req.json();
    
    if (!requestData.test_id || !requestData.raw_data) {
      return new Response(JSON.stringify({ error: 'Missing required fields: test_id and raw_data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing CBR computation for test:', requestData.test_id);
    
    const result = calculateCBRParameters(requestData.raw_data, requestData.metadata);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in CBR computation:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
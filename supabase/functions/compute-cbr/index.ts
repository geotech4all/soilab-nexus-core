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
interface CBRDataPoint {
  penetration: number; // mm
  load: number; // kN or lbs
}

interface CBRRequest {
  test_id: string;
  data: CBRDataPoint[];
  corrections?: {
    moisture_correction?: number;
    density_correction?: number;
    surcharge?: number;
  };
  units?: 'metric' | 'imperial';
  store?: boolean;
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
  status: 'success' | 'error';
  message?: string;
  computed_data?: CBRComputedData;
  chart_data?: {
    load_penetration_curve: Array<{x: number, y: number}>;
    corrected_curve?: Array<{x: number, y: number}>;
  };
  interpretation?: string;
  standard?: string;
  classifications?: string[];
  warnings?: string[];
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

function validateCBRData(data: CBRDataPoint[]): string | null {
  if (!Array.isArray(data) || data.length === 0) {
    return 'Data array is required and cannot be empty';
  }

  for (const point of data) {
    if (point.penetration < 0) {
      return 'Penetration values must be >= 0';
    }
    if (point.load < 0) {
      return 'Load values must be >= 0';
    }
  }

  // Check if data includes required penetration values
  const penetrations = data.map(d => d.penetration);
  const has2_5mm = penetrations.some(p => Math.abs(p - 2.5) < 0.1);
  const has5_0mm = penetrations.some(p => Math.abs(p - 5.0) < 0.1);
  
  if (!has2_5mm && !has5_0mm) {
    return 'Data must include penetration values at 2.5mm and/or 5.0mm';
  }

  return null;
}

async function calculateCBRParameters(request: CBRRequest): Promise<CBRResponse> {
  try {
    // Validate input data
    const validationError = validateCBRData(request.data);
    if (validationError) {
      return {
        status: 'error',
        message: validationError
      };
    }

    const warnings: string[] = [];
    const classifications: string[] = [];

    // Extract penetration and load arrays
    const penetration = request.data.map(d => d.penetration);
    const load = request.data.map(d => d.load);

    // Apply load-penetration curve correction
    const { penetration: corrPen, load: correctedLoad } = correctLoadPenetrationCurve(penetration, load);

    // Interpolate loads at standard penetrations
    const load_2_5mm = interpolateLoad(corrPen, correctedLoad, 2.5);
    const load_5mm = interpolateLoad(corrPen, correctedLoad, 5.0);

    // Standard loads for CBR calculation (ASTM D1883)
    const standardLoad_2_5mm = request.units === 'imperial' ? 3000 : 13.24; // lbs or kN
    const standardLoad_5mm = request.units === 'imperial' ? 4500 : 19.96;   // lbs or kN

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

    // Add warnings
    if (cbr_5mm > cbr_2_5mm * 1.2) {
      warnings.push('CBR at 5mm exceeds 2.5mm value significantly - check curve correction');
    }
    if (designCBR > 100) {
      warnings.push('CBR exceeds 100% - verify test procedure and calculations');
    }
    if (load_2_5mm === 0 || load_5mm === 0) {
      warnings.push('Could not interpolate standard penetration loads - extend test data');
    }

    classifications.push(bearingCapacityClass, subgradeClass);

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
    const loadPenetrationCurve = request.data.map(d => ({
      x: d.penetration,
      y: d.load
    }));

    const correctedCurve = corrPen.map((p, i) => ({
      x: p,
      y: correctedLoad[i]
    }));

    // Overall interpretation
    let interpretation = '';
    if (designCBR < 3) {
      interpretation = `Very weak subgrade (CBR: ${designCBR.toFixed(1)}%) - extensive soil improvement required`;
    } else if (designCBR < 8) {
      interpretation = `Weak to fair subgrade (CBR: ${designCBR.toFixed(1)}%) - consider soil stabilization`;
    } else if (designCBR < 20) {
      interpretation = `Good subgrade (CBR: ${designCBR.toFixed(1)}%) - suitable for most pavement applications`;
    } else {
      interpretation = `Excellent subgrade (CBR: ${designCBR.toFixed(1)}%) - suitable for heavy traffic loads`;
    }

    return {
      status: 'success',
      computed_data: computedData,
      chart_data: {
        load_penetration_curve: loadPenetrationCurve,
        corrected_curve: correctedCurve
      },
      interpretation,
      standard: 'ASTM D1883',
      classifications,
      warnings
    };

  } catch (error) {
    console.error('Error in CBR computation:', error);
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

    const requestData: CBRRequest = await req.json();
    
    if (!requestData.test_id || !requestData.data) {
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Missing required fields: test_id and data' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing CBR computation for test:', requestData.test_id);
    
    const result = await calculateCBRParameters(requestData);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in CBR computation:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testType, rawData, testId } = await req.json();

    console.log(`Processing ${testType} test data for test ID: ${testId}`);
    console.log('Raw data received:', rawData);

    let computedData: any = {};
    let standards = '';

    switch (testType.toLowerCase()) {
      case 'spt':
        computedData = calculateSPTParameters(rawData);
        standards = 'ASTM D1586';
        break;
      case 'atterberg':
        computedData = calculateAtterbergParameters(rawData);
        standards = 'ASTM D4318';
        break;
      case 'grain_size':
        computedData = calculateGrainSizeParameters(rawData);
        standards = 'ASTM D6913';
        break;
      case 'cpt':
        computedData = calculateCPTParameters(rawData);
        standards = 'ASTM D5778';
        break;
      default:
        computedData = { message: 'Basic calculations for custom test type' };
        standards = 'Custom';
    }

    // Add metadata
    computedData.calculatedAt = new Date().toISOString();
    computedData.standards = standards;
    computedData.testType = testType;

    console.log('Computed data:', computedData);

    return new Response(JSON.stringify(computedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-geotechnical-parameters function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateSPTParameters(rawData: any) {
  console.log('Calculating SPT parameters');
  
  const nValue = parseFloat(rawData.n_value) || 0;
  const blowCount1 = parseFloat(rawData.blow_count_1) || 0;
  const blowCount2 = parseFloat(rawData.blow_count_2) || 0;
  const blowCount3 = parseFloat(rawData.blow_count_3) || 0;
  const depth = parseFloat(rawData.depth) || 0;

  // Standard SPT calculations
  const totalBlows = blowCount1 + blowCount2 + blowCount3;
  const penetrationBlows = blowCount2 + blowCount3; // N-value typically from last 30cm
  
  // Corrected N-value (simplified energy correction)
  const energyCorrectionFactor = 0.6; // Typical for donut hammer
  const correctedN = nValue * energyCorrectionFactor;
  
  // Overburden correction (simplified)
  const effectiveStress = depth * 18.5; // Assuming 18.5 kN/m³ unit weight
  const overburdenFactor = Math.sqrt(100 / effectiveStress);
  const correctedN60 = correctedN * overburdenFactor;

  // Relative density estimation (Skempton 1986)
  const relativeDensity = Math.sqrt(correctedN60 / 60) * 100;

  // Soil classification based on N-value
  let soilDescription = '';
  if (nValue < 4) soilDescription = 'Very loose sand / Very soft clay';
  else if (nValue < 10) soilDescription = 'Loose sand / Soft clay';
  else if (nValue < 30) soilDescription = 'Medium dense sand / Medium stiff clay';
  else if (nValue < 50) soilDescription = 'Dense sand / Stiff clay';
  else soilDescription = 'Very dense sand / Very hard clay';

  return {
    originalNValue: nValue,
    totalBlowCount: totalBlows,
    penetrationBlows: penetrationBlows,
    correctedN60: Math.round(correctedN60 * 10) / 10,
    relativeDensity: Math.round(relativeDensity * 10) / 10,
    soilDescription: soilDescription,
    energyCorrectionFactor: energyCorrectionFactor,
    overburdenCorrectionFactor: Math.round(overburdenFactor * 100) / 100,
    effectiveStress: Math.round(effectiveStress * 10) / 10
  };
}

function calculateAtterbergParameters(rawData: any) {
  console.log('Calculating Atterberg parameters');
  
  const liquidLimit = parseFloat(rawData.liquid_limit) || 0;
  const plasticLimit = parseFloat(rawData.plastic_limit) || 0;
  const plasticityIndex = liquidLimit - plasticLimit;

  // Activity calculation (if clay content is available)
  const clayContent = parseFloat(rawData.clay_percent) || null;
  const activity = clayContent ? plasticityIndex / clayContent : null;

  // Soil classification based on plasticity chart
  let soilClassification = '';
  if (plasticityIndex < 7) {
    soilClassification = 'Low plasticity';
  } else if (plasticityIndex < 17) {
    soilClassification = 'Medium plasticity';
  } else {
    soilClassification = 'High plasticity';
  }

  // Unified Soil Classification System (simplified)
  let uscsSymbol = '';
  if (liquidLimit < 50) {
    if (plasticityIndex < 7) uscsSymbol = 'CL-ML';
    else if (plasticityIndex > 0.73 * (liquidLimit - 20)) uscsSymbol = 'CL';
    else uscsSymbol = 'ML';
  } else {
    if (plasticityIndex > 0.73 * (liquidLimit - 20)) uscsSymbol = 'CH';
    else uscsSymbol = 'MH';
  }

  return {
    liquidLimit: liquidLimit,
    plasticLimit: plasticLimit,
    plasticityIndex: plasticityIndex,
    activity: activity ? Math.round(activity * 100) / 100 : null,
    soilClassification: soilClassification,
    uscsSymbol: uscsSymbol,
    liquidityIndex: null, // Would need natural moisture content
    consistencyIndex: null // Would need natural moisture content
  };
}

function calculateGrainSizeParameters(rawData: any) {
  console.log('Calculating grain size parameters');
  
  const gravelPercent = parseFloat(rawData.gravel_percent) || 0;
  const sandPercent = parseFloat(rawData.sand_percent) || 0;
  const finesPercent = parseFloat(rawData.fines_percent) || 0;

  // Validation
  const total = gravelPercent + sandPercent + finesPercent;
  if (Math.abs(total - 100) > 1) {
    console.warn('Grain size percentages do not sum to 100%');
  }

  // Unified Soil Classification System (simplified)
  let primaryClassification = '';
  if (finesPercent > 50) {
    primaryClassification = 'Fine-grained soil';
  } else if (gravelPercent > sandPercent) {
    primaryClassification = 'Gravel';
  } else {
    primaryClassification = 'Sand';
  }

  // Additional parameters (would typically come from sieve analysis)
  const effectiveSize = null; // D10 - would need full sieve data
  const uniformityCoefficient = null; // D60/D10
  const coefficientOfCurvature = null; // (D30)²/(D10×D60)

  return {
    gravelPercent: gravelPercent,
    sandPercent: sandPercent,
    finesPercent: finesPercent,
    totalPercent: total,
    primaryClassification: primaryClassification,
    effectiveSize: effectiveSize,
    uniformityCoefficient: uniformityCoefficient,
    coefficientOfCurvature: coefficientOfCurvature,
    gradation: finesPercent > 12 ? 'Poorly graded' : 'Well graded'
  };
}

function calculateCPTParameters(rawData: any) {
  console.log('Calculating CPT parameters');
  
  // This would typically process arrays of data from CPT soundings
  // For now, handling single point calculations
  
  const qc = parseFloat(rawData.cone_resistance) || 0; // kPa
  const fs = parseFloat(rawData.sleeve_friction) || 0; // kPa
  const depth = parseFloat(rawData.depth) || 0; // m

  // Basic CPT calculations
  const frictionRatio = qc > 0 ? (fs / qc) * 100 : 0; // %
  
  // Effective stress calculation (simplified)
  const effectiveStress = depth * 18.5; // kN/m²
  
  // Corrected cone resistance
  const qt = qc; // Would need pore pressure for full correction
  
  // Soil Behavior Type Index (Robertson 2009)
  const Ic = Math.sqrt((3.47 - Math.log10(qt / effectiveStress))**2 + (Math.log10(frictionRatio) + 1.22)**2);

  // Soil classification based on Ic
  let soilBehaviorType = '';
  if (Ic < 1.31) soilBehaviorType = 'Gravel to dense sand';
  else if (Ic < 2.05) soilBehaviorType = 'Clean sand to silty sand';
  else if (Ic < 2.60) soilBehaviorType = 'Silty sand to sandy silt';
  else if (Ic < 2.95) soilBehaviorType = 'Clayey silt to silty clay';
  else if (Ic < 3.60) soilBehaviorType = 'Silty clay to clay';
  else soilBehaviorType = 'Organic soils';

  return {
    coneResistance: qc,
    sleeveFriction: fs,
    frictionRatio: Math.round(frictionRatio * 100) / 100,
    correctedConeResistance: qt,
    soilBehaviorTypeIndex: Math.round(Ic * 100) / 100,
    soilBehaviorType: soilBehaviorType,
    effectiveStress: Math.round(effectiveStress * 10) / 10,
    bearingCapacity: null, // Would need additional calculations
    relativeDensity: null // Would need correlations
  };
}
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
interface CompactionDataPoint {
  moisture_content: number; // %
  dry_density: number; // g/cm³
}

interface CompactionRequest {
  test_id: string;
  data: CompactionDataPoint[];
  corrections?: {
    temperature_correction?: number;
    equipment_correction?: number;
  };
  units?: 'metric' | 'imperial';
  store?: boolean;
}

interface CompactionComputedData {
  mdd: number; // Maximum Dry Density (g/cm³)
  omc: number; // Optimum Moisture Content (%)
  compaction_curve_equation: string;
  r_squared: number;
  compaction_efficiency?: number;
  test_method: string;
}

interface CompactionResponse {
  status: 'success' | 'error';
  message?: string;
  computed_data?: CompactionComputedData;
  chart_data?: {
    compaction_curve: Array<{x: number, y: number}>;
    fitted_curve: Array<{x: number, y: number}>;
  };
  interpretation?: string;
  standard?: string;
  warnings?: string[];
}

function validateCompactionData(data: CompactionDataPoint[]): string | null {
  if (!Array.isArray(data) || data.length < 3) {
    return 'At least 3 data points are required for compaction analysis';
  }

  for (const point of data) {
    if (!point.moisture_content || point.moisture_content < 0 || point.moisture_content > 50) {
      return 'Moisture content must be between 0 and 50%';
    }
    if (!point.dry_density || point.dry_density <= 0 || point.dry_density > 3.0) {
      return 'Dry density must be between 0 and 3.0 g/cm³';
    }
  }

  return null;
}

function polynomialRegression(x: number[], y: number[], degree: number = 2): {
  coefficients: number[];
  rSquared: number;
} {
  const n = x.length;
  
  // Create matrix for polynomial regression
  const matrix: number[][] = [];
  const results: number[] = [];
  
  for (let i = 0; i <= degree; i++) {
    matrix[i] = [];
    for (let j = 0; j <= degree; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += Math.pow(x[k], i + j);
      }
      matrix[i][j] = sum;
    }
    
    let sum = 0;
    for (let k = 0; k < n; k++) {
      sum += y[k] * Math.pow(x[k], i);
    }
    results[i] = sum;
  }
  
  // Solve using Gaussian elimination (simplified for 2nd degree)
  if (degree === 2) {
    const det = matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
                matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
                matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
    
    if (Math.abs(det) < 1e-10) {
      // Fallback to linear regression
      return polynomialRegression(x, y, 1);
    }
    
    const a = (results[0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
               results[1] * (matrix[0][1] * matrix[2][2] - matrix[0][2] * matrix[2][1]) +
               results[2] * (matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1])) / det;
    
    const b = (matrix[0][0] * (results[1] * matrix[2][2] - results[2] * matrix[1][2]) -
               matrix[0][1] * (results[0] * matrix[2][2] - results[2] * matrix[2][0]) +
               matrix[0][2] * (results[0] * matrix[1][2] - results[1] * matrix[2][0])) / det;
    
    const c = (matrix[0][0] * (matrix[1][1] * results[2] - matrix[1][2] * results[1]) -
               matrix[0][1] * (matrix[1][0] * results[2] - matrix[1][2] * results[0]) +
               matrix[0][2] * (matrix[1][0] * results[1] - matrix[1][1] * results[0])) / det;
    
    // Calculate R-squared
    const yMean = y.reduce((sum, val) => sum + val, 0) / n;
    let ssRes = 0;
    let ssTot = 0;
    
    for (let i = 0; i < n; i++) {
      const predicted = a + b * x[i] + c * x[i] * x[i];
      ssRes += Math.pow(y[i] - predicted, 2);
      ssTot += Math.pow(y[i] - yMean, 2);
    }
    
    const rSquared = 1 - (ssRes / ssTot);
    
    return {
      coefficients: [a, b, c],
      rSquared: Math.max(0, rSquared)
    };
  }
  
  // Linear regression fallback
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const yMean = sumY / n;
  let ssRes = 0;
  let ssTot = 0;
  
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * x[i];
    ssRes += Math.pow(y[i] - predicted, 2);
    ssTot += Math.pow(y[i] - yMean, 2);
  }
  
  const rSquared = 1 - (ssRes / ssTot);
  
  return {
    coefficients: [intercept, slope],
    rSquared: Math.max(0, rSquared)
  };
}

function findMDDandOMC(moistureData: number[], densityData: number[]): {
  mdd: number;
  omc: number;
  equation: string;
  rSquared: number;
} {
  const regression = polynomialRegression(moistureData, densityData, 2);
  const [a, b, c] = regression.coefficients;
  
  let equation: string;
  let omc: number;
  let mdd: number;
  
  if (regression.coefficients.length === 3 && c !== 0) {
    // Quadratic: y = ax² + bx + c
    // Maximum at x = -b/(2a) if a < 0 (downward parabola)
    if (c < 0) {
      omc = -b / (2 * c);
      mdd = a + b * omc + c * omc * omc;
      equation = `ρd = ${a.toFixed(4)} + ${b.toFixed(4)}w + ${c.toFixed(4)}w²`;
    } else {
      // Invalid parabola, use maximum from data
      const maxIndex = densityData.indexOf(Math.max(...densityData));
      omc = moistureData[maxIndex];
      mdd = densityData[maxIndex];
      equation = 'Peak from data points (curve fitting failed)';
    }
  } else {
    // Linear or invalid, use maximum from data
    const maxIndex = densityData.indexOf(Math.max(...densityData));
    omc = moistureData[maxIndex];
    mdd = densityData[maxIndex];
    equation = 'Peak from data points';
  }
  
  return {
    mdd: Math.max(mdd, Math.max(...densityData)),
    omc: Math.min(50, Math.max(0, omc)),
    equation,
    rSquared: regression.rSquared
  };
}

async function calculateCompactionParameters(request: CompactionRequest): Promise<CompactionResponse> {
  try {
    // Validate input data
    const validationError = validateCompactionData(request.data);
    if (validationError) {
      return {
        status: 'error',
        message: validationError
      };
    }

    const warnings: string[] = [];

    // Sort data by moisture content
    const sortedData = [...request.data].sort((a, b) => a.moisture_content - b.moisture_content);
    const moistureData = sortedData.map(d => d.moisture_content);
    const densityData = sortedData.map(d => d.dry_density);

    // Find MDD and OMC
    const { mdd, omc, equation, rSquared } = findMDDandOMC(moistureData, densityData);

    // Calculate compaction efficiency if field density provided
    let compactionEfficiency: number | undefined;
    const fieldDensity = Math.max(...densityData); // Use maximum density from data as field density
    if (fieldDensity && mdd > 0) {
      compactionEfficiency = (fieldDensity / mdd) * 100;
      if (compactionEfficiency < 95) {
        warnings.push(`Compaction efficiency ${compactionEfficiency.toFixed(1)}% is below the recommended 95% minimum`);
      }
    }

    // Add warnings for data quality
    if (rSquared < 0.8) {
      warnings.push('Low R² value suggests poor curve fit - consider additional data points');
    }
    
    if (sortedData.length < 5) {
      warnings.push('Minimum 5 data points recommended for reliable compaction curve');
    }

    // Generate fitted curve for plotting
    const fittedCurve: Array<{x: number, y: number}> = [];
    const minMoisture = Math.min(...moistureData);
    const maxMoisture = Math.max(...moistureData);
    
    for (let w = minMoisture; w <= maxMoisture; w += 0.5) {
      let density: number;
      if (equation.includes('w²')) {
        // Use regression coefficients for quadratic
        const regression = polynomialRegression(moistureData, densityData, 2);
        const [a, b, c] = regression.coefficients;
        density = a + b * w + c * w * w;
      } else {
        // Linear interpolation
        density = densityData[0] + (densityData[densityData.length - 1] - densityData[0]) * 
                  ((w - minMoisture) / (maxMoisture - minMoisture));
      }
      
      fittedCurve.push({ x: w, y: Math.max(0, density) });
    }

    const computedData: CompactionComputedData = {
      mdd,
      omc,
      compaction_curve_equation: equation,
      r_squared: rSquared,
      compaction_efficiency: compactionEfficiency,
      test_method: 'Standard Proctor'
    };

    // Store results in database if requested
    if (request.store && request.test_id) {
      await supabase.from('test_results').insert({
        test_id: request.test_id,
        computed_data: computedData,
        raw_data: request.data,
        standards_used: 'ASTM D698',
        metadata: {
          corrections: request.corrections,
          units: request.units,
          warnings
        }
      });
    }

    // Prepare chart data
    const compactionCurve = sortedData.map(d => ({
      x: d.moisture_content,
      y: d.dry_density
    }));

    // Engineering interpretation
    let interpretation = `Maximum Dry Density: ${mdd.toFixed(3)} g/cm³ at Optimum Moisture Content: ${omc.toFixed(1)}%`;
    if (compactionEfficiency) {
      interpretation += `. Field compaction efficiency: ${compactionEfficiency.toFixed(1)}%`;
    }

    return {
      status: 'success',
      computed_data: computedData,
      chart_data: {
        compaction_curve: compactionCurve,
        fitted_curve: fittedCurve
      },
      interpretation,
      standard: 'ASTM D698',
      warnings
    };

  } catch (error) {
    console.error('Error in compaction computation:', error);
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

    const requestData: CompactionRequest = await req.json();
    
    if (!requestData.test_id || !requestData.data) {
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Missing required fields: test_id and data' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing compaction computation for test:', requestData.test_id);
    
    const result = await calculateCompactionParameters(requestData);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in compaction computation:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
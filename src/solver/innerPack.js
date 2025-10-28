// Inner pack solver - finds optimal arrangement of SKU units in masterpack

/**
 * Calculate internal dimensions of masterpack
 */
export const calculateInternalDims = (externalDims, wallThickness) => {
  return {
    L: externalDims.L - (2 * wallThickness),
    W: externalDims.W - (2 * wallThickness),
    H: externalDims.H - (2 * wallThickness)
  };
};

/**
 * Try a specific rotation and calculate how many units fit
 */
const tryRotation = (unitDims, internalDims, rotation, squishPct) => {
  // Apply rotation mapping (e.g., 'LWH' means L→L, W→W, H→H)
  const rotated = {
    L: unitDims[rotation[0]],
    W: unitDims[rotation[1]],
    H: unitDims[rotation[2]]
  };
  
  // Apply squish percentage
  const adjusted = {
    L: rotated.L * (1 - squishPct.x),
    W: rotated.W * (1 - squishPct.y),
    H: rotated.H * (1 - squishPct.z)
  };
  
  // Calculate how many fit in each dimension
  const nx = Math.floor(internalDims.L / adjusted.L);
  const ny = Math.floor(internalDims.W / adjusted.W);
  const nz = Math.floor(internalDims.H / adjusted.H);
  
  const count = nx * ny * nz;
  
  // Calculate utilization
  const usedVolume = count * (adjusted.L * adjusted.W * adjusted.H);
  const availableVolume = internalDims.L * internalDims.W * internalDims.H;
  const utilization = usedVolume / availableVolume;
  
  return {
    rotation,
    nx,
    ny,
    nz,
    count,
    utilization,
    rotatedDims: rotated,
    adjustedDims: adjusted
  };
};

/**
 * Score an arrangement based on preferences
 */
const scoreArrangement = (arrangement, preferMultiplesOf) => {
  const { count, utilization } = arrangement;
  
  // Check if count is a multiple of preferred number
  const isPreferredMultiple = count % preferMultiplesOf === 0;
  const distanceToMultiple = count % preferMultiplesOf;
  
  // Scoring weights
  let score = 0;
  
  // Prefer multiples of target (e.g., 6, 12, 18, 24...)
  if (isPreferredMultiple) {
    score += 1000;
  } else {
    // Closer to multiple is better
    score += (preferMultiplesOf - distanceToMultiple) * 10;
  }
  
  // Higher utilization is better
  score += utilization * 500;
  
  // Prefer simpler grids (fewer layers)
  score -= arrangement.nz * 0.1;
  
  return score;
};

/**
 * Find best arrangement for a SKU in the masterpack
 */
export const findBestArrangement = (sku, config) => {
  const { masterpack, solver } = config;
  const internalDims = calculateInternalDims(masterpack.external, masterpack.wall_thickness_in);
  
  const unitDims = {
    L: sku.L,
    W: sku.W,
    H: sku.H
  };
  
  // All possible rotations
  const rotations = ['LWH', 'LHW', 'WLH', 'WHL', 'HLW', 'HWL'];
  
  // Try all rotations
  const arrangements = rotations.map(rotation => 
    tryRotation(unitDims, internalDims, rotation, solver.squish_pct)
  );
  
  // Filter out arrangements that don't fit
  const validArrangements = arrangements.filter(a => a.count > 0);
  
  if (validArrangements.length === 0) {
    return {
      fits: false,
      reason: 'SKU dimensions too large for masterpack',
      failingAxis: findFailingAxis(unitDims, internalDims)
    };
  }
  
  // Score and sort arrangements
  const scoredArrangements = validArrangements.map(arr => ({
    ...arr,
    score: scoreArrangement(arr, solver.prefer_multiples_of)
  }));
  
  scoredArrangements.sort((a, b) => b.score - a.score);
  
  const best = scoredArrangements[0];
  
  // Calculate weight
  const unitWeightLb = sku.oz / 16;
  const totalProductWeight = best.count * unitWeightLb;
  const grossCaseWeight = totalProductWeight + masterpack.tare_lb;
  
  return {
    fits: true,
    ...best,
    unitWeightLb,
    totalProductWeight,
    grossCaseWeight,
    isLowDensity: best.count < 20,
    isHeavy: grossCaseWeight > 40,
    internalDims
  };
};

/**
 * Find which axis is preventing the SKU from fitting
 */
const findFailingAxis = (unitDims, internalDims) => {
  const axes = ['L', 'W', 'H'];
  const failing = [];
  
  // Check if unit is too large in any dimension
  axes.forEach(axis => {
    const minUnitDim = Math.min(unitDims.L, unitDims.W, unitDims.H);
    if (minUnitDim > internalDims[axis]) {
      failing.push(axis);
    }
  });
  
  return failing.length > 0 ? failing : ['all'];
};

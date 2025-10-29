// Multi-SKU optimizer - finds best single masterpack size for all products

import { findBestArrangement } from './innerPack';

/**
 * Analyze all SKUs against current masterpack
 * Returns theoretical vs actual comparison
 */
export const analyzeCurrentMasterpack = (skus, config) => {
  const results = skus.map(sku => {
    const theoretical = findBestArrangement(sku, config);
    
    // Use real squish factor from data if available, otherwise calculate
    const squishFactor = sku.squish_factor || (
      sku.current_baseline && theoretical.fits 
        ? sku.current_baseline / theoretical.count 
        : 1.0
    );
    
    // Calculate real box utilization if box dimensions are available
    let boxUtilization = 0;
    if (sku.box_dims) {
      const boxVolume = sku.box_dims.L * sku.box_dims.W * sku.box_dims.H;
      const itemVolume = sku.L * sku.W * sku.H;
      boxUtilization = (itemVolume * sku.current_baseline) / boxVolume;
    }
    
    return {
      sku: sku.sku,
      dims: { L: sku.L, W: sku.W, H: sku.H },
      theoretical: theoretical.fits ? theoretical.count : 0,
      actual: sku.current_baseline || 0,
      squishFactor,
      theoreticalUtil: theoretical.fits ? theoretical.utilization : 0,
      actualUtil: theoretical.fits && sku.current_baseline 
        ? (sku.current_baseline / theoretical.count) * theoretical.utilization 
        : 0,
      boxUtilization: boxUtilization, // Real box utilization
      rotation: theoretical.fits ? theoretical.rotation : 'N/A',
      weight: theoretical.fits ? theoretical.grossCaseWeight : (sku.box_weight_lb || 0),
      compressible: sku.compressible,
      notes: sku.notes,
      originalHeight: sku.original_H,
      currentBoxDims: sku.box_dims
    };
  });
  
  // Calculate summary statistics
  const summary = {
    totalSkus: results.length,
    avgSquishFactor: results.reduce((sum, r) => sum + r.squishFactor, 0) / results.length,
    avgTheoreticalUtil: results.reduce((sum, r) => sum + r.theoreticalUtil, 0) / results.length,
    avgActualUtil: results.reduce((sum, r) => sum + r.actualUtil, 0) / results.length,
    avgBoxUtilization: results.reduce((sum, r) => sum + (r.boxUtilization || 0), 0) / results.length,
    problematicSkus: results.filter(r => r.squishFactor > 1.2 || r.squishFactor < 0.8).length,
    underutilizedSkus: results.filter(r => (r.boxUtilization || 0) < 0.75).length
  };
  
  return { results, summary };
};

/**
 * Generate candidate box dimensions to test
 */
const generateCandidateDimensions = (minDim = 12, maxDim = 24, step = 1) => {
  const candidates = [];
  
  for (let L = minDim; L <= maxDim; L += step) {
    for (let W = minDim; W <= maxDim; W += step) {
      for (let H = minDim; H <= maxDim; H += step) {
        // Only consider reasonable aspect ratios
        const maxRatio = Math.max(L/W, W/L, L/H, H/L, W/H, H/W);
        if (maxRatio <= 2.0) {
          candidates.push({ L, W, H });
        }
      }
    }
  }
  
  return candidates;
};

/**
 * Check if box dimensions fit well on pallet with interlocking
 */
const checkPalletFit = (boxDims, palletDims) => {
  const { L: boxL, W: boxW, H: boxH } = boxDims;
  const { L: palletL, W: palletW } = palletDims;
  
  // Try both orientations for interlocking pattern
  // Layer 1: boxes oriented one way
  const layer1Wide = Math.floor(palletW / boxW);
  const layer1Long = Math.floor(palletL / boxL);
  const layer1Count = layer1Wide * layer1Long;
  
  // Layer 2: boxes rotated 90 degrees
  const layer2Wide = Math.floor(palletW / boxL);
  const layer2Long = Math.floor(palletL / boxW);
  const layer2Count = layer2Wide * layer2Long;
  
  // Calculate coverage for both layers
  const layer1Coverage = (layer1Wide * boxW * layer1Long * boxL) / (palletL * palletW);
  const layer2Coverage = (layer2Wide * boxL * layer2Long * boxW) / (palletL * palletW);
  
  // Average coverage across alternating layers
  const avgCoverage = (layer1Coverage + layer2Coverage) / 2;
  
  // Check if interlocking is possible (both layers must fit at least 1 box)
  const canInterlock = layer1Count > 0 && layer2Count > 0;
  
  return {
    canInterlock,
    layer1Count,
    layer2Count,
    avgCoverage,
    layer1Coverage,
    layer2Coverage
  };
};

/**
 * Score a box dimension candidate
 */
const scoreBoxCandidate = (boxDims, skus, config, palletFit) => {
  // Test all SKUs in this box
  const testConfig = {
    ...config,
    masterpack: {
      ...config.masterpack,
      external: boxDims
    }
  };
  
  const skuResults = skus.map(sku => {
    const result = findBestArrangement(sku, testConfig);
    return {
      sku: sku.sku,
      fits: result.fits,
      count: result.fits ? result.count : 0,
      utilization: result.fits ? result.utilization : 0,
      currentBaseline: sku.current_baseline || 0
    };
  });
  
  // Calculate metrics
  const allFit = skuResults.every(r => r.fits);
  const avgUtilization = skuResults.reduce((sum, r) => sum + r.utilization, 0) / skuResults.length;
  const totalVolume = boxDims.L * boxDims.W * boxDims.H;
  
  // Compare to current baselines
  const baselineComparison = skuResults.map(r => {
    if (r.currentBaseline > 0) {
      return r.count / r.currentBaseline;
    }
    return 1.0;
  });
  const avgBaselineRatio = baselineComparison.reduce((sum, r) => sum + r, 0) / baselineComparison.length;
  
  // Scoring
  let score = 0;
  
  // Must fit all SKUs
  if (!allFit) return { score: -1000, ...skuResults };
  
  // Prefer high utilization
  score += avgUtilization * 500;
  
  // Prefer smaller boxes (less material)
  score -= totalVolume * 0.1;
  
  // Prefer boxes that match or exceed current baselines
  score += avgBaselineRatio * 300;
  
  // Prefer good pallet fit
  if (palletFit.canInterlock) {
    score += 200;
    score += palletFit.avgCoverage * 300;
  }
  
  return {
    score,
    allFit,
    avgUtilization,
    totalVolume,
    avgBaselineRatio,
    palletFit,
    skuResults
  };
};

/**
 * Find optimal masterpack dimensions for all SKUs
 */
export const findOptimalMasterpack = (skus, config, options = {}) => {
  const {
    minDim = 12,
    maxDim = 24,
    step = 1
  } = options;
  
  console.log('Generating candidate dimensions...');
  const candidates = generateCandidateDimensions(minDim, maxDim, step);
  console.log(`Testing ${candidates.length} candidates...`);
  
  // Score all candidates
  const scoredCandidates = candidates.map(dims => {
    const palletFit = checkPalletFit(dims, config.pallet);
    const score = scoreBoxCandidate(dims, skus, config, palletFit);
    
    return {
      dims,
      ...score
    };
  }).filter(c => c.score > 0); // Only keep valid candidates
  
  // Sort by score
  scoredCandidates.sort((a, b) => b.score - a.score);
  
  // Return top candidates
  return {
    optimal: scoredCandidates[0],
    topCandidates: scoredCandidates.slice(0, 5),
    totalTested: candidates.length,
    validCandidates: scoredCandidates.length
  };
};

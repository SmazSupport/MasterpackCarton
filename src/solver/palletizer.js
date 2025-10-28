// Pallet stacking solver

/**
 * Calculate how many cases fit on a pallet layer using column pattern
 */
const calculateColumnPattern = (caseDims, palletDims, maxOverhang) => {
  const { L: caseL, W: caseW } = caseDims;
  const { L: palletL, W: palletW } = palletDims;
  
  // Try both orientations
  const option1 = {
    wide: Math.floor(palletW / caseW),
    long: Math.floor(palletL / caseL),
    overhangW: (palletW - Math.floor(palletW / caseW) * caseW),
    overhangL: (palletL - Math.floor(palletL / caseL) * caseL)
  };
  
  const option2 = {
    wide: Math.floor(palletW / caseL),
    long: Math.floor(palletL / caseW),
    overhangW: (palletW - Math.floor(palletW / caseL) * caseL),
    overhangL: (palletL - Math.floor(palletL / caseW) * caseW)
  };
  
  // Check overhang limits
  const option1Valid = option1.overhangW <= maxOverhang && option1.overhangL <= maxOverhang;
  const option2Valid = option2.overhangW <= maxOverhang && option2.overhangL <= maxOverhang;
  
  const option1Count = option1.wide * option1.long;
  const option2Count = option2.wide * option2.long;
  
  // Choose best valid option
  if (option1Valid && option2Valid) {
    return option1Count >= option2Count ? option1 : option2;
  } else if (option1Valid) {
    return option1;
  } else if (option2Valid) {
    return option2;
  } else {
    // Return best option even if overhang exceeds limit
    return option1Count >= option2Count ? { ...option1, exceedsOverhang: true } : { ...option2, exceedsOverhang: true };
  }
};

/**
 * Calculate brick pattern (alternating orientations)
 */
const calculateBrickPattern = (caseDims, palletDims, maxOverhang) => {
  // For brick pattern, we alternate case orientations
  // This is more complex - for now, use column pattern
  // TODO: Implement true brick pattern
  return calculateColumnPattern(caseDims, palletDims, maxOverhang);
};

/**
 * Calculate pinwheel pattern
 */
const calculatePinwheelPattern = (caseDims, palletDims, maxOverhang) => {
  // Pinwheel rotates cases 90° in a pattern
  // For now, use column pattern
  // TODO: Implement true pinwheel pattern
  return calculateColumnPattern(caseDims, palletDims, maxOverhang);
};

/**
 * Calculate swap 40-48 pattern (alternating layers)
 */
const calculateSwap4048Pattern = (caseDims, palletDims, maxOverhang) => {
  // Alternate between 40" and 48" orientations per layer
  // For now, use column pattern
  // TODO: Implement layer alternation
  return calculateColumnPattern(caseDims, palletDims, maxOverhang);
};

/**
 * Calculate pallet stacking for a given pattern
 */
export const calculatePalletStacking = (caseDims, palletConfig, targetHeight, pattern = 'column') => {
  const { pallet, solver } = palletConfig;
  const maxOverhang = solver.max_overhang_in;
  
  let layerResult;
  
  switch (pattern) {
    case 'brick':
      layerResult = calculateBrickPattern(caseDims, pallet, maxOverhang);
      break;
    case 'pinwheel':
      layerResult = calculatePinwheelPattern(caseDims, pallet, maxOverhang);
      break;
    case 'swap-40-48':
      layerResult = calculateSwap4048Pattern(caseDims, pallet, maxOverhang);
      break;
    case 'column':
    default:
      layerResult = calculateColumnPattern(caseDims, pallet, maxOverhang);
  }
  
  const casesPerLayer = layerResult.wide * layerResult.long;
  
  // Calculate how many layers fit
  const availableHeight = targetHeight - pallet.H;
  const maxLayers = Math.floor(availableHeight / caseDims.H);
  
  const totalCases = casesPerLayer * maxLayers;
  const actualPalletHeight = pallet.H + (maxLayers * caseDims.H);
  
  // Calculate coverage (how much of pallet surface is used)
  const palletArea = pallet.L * pallet.W;
  const usedArea = (layerResult.wide * caseDims.W) * (layerResult.long * caseDims.L);
  const coverage = usedArea / palletArea;
  
  return {
    pattern,
    casesWide: layerResult.wide,
    casesLong: layerResult.long,
    casesPerLayer,
    maxLayers,
    totalCases,
    palletHeight: actualPalletHeight,
    coverage,
    overhangW: layerResult.overhangW || 0,
    overhangL: layerResult.overhangL || 0,
    exceedsOverhang: layerResult.exceedsOverhang || false
  };
};

/**
 * Find best pallet pattern from allowed patterns
 */
export const findBestPalletPattern = (caseDims, palletConfig, targetHeight) => {
  const { solver } = palletConfig;
  const allowedPatterns = solver.allow_patterns || ['column'];
  
  const results = allowedPatterns.map(pattern => 
    calculatePalletStacking(caseDims, palletConfig, targetHeight, pattern)
  );
  
  // Sort by total cases (descending), then by coverage
  results.sort((a, b) => {
    if (b.totalCases !== a.totalCases) {
      return b.totalCases - a.totalCases;
    }
    return b.coverage - a.coverage;
  });
  
  return results[0];
};

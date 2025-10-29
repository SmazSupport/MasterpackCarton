// Utility functions for analyzing kit measurement data

import kitData from '../data/kitMeasurements.json';

/**
 * Calculate the volume of a box given its dimensions
 */
export const calculateVolume = (dimensions) => {
  return dimensions.width * dimensions.length * dimensions.height;
};

/**
 * Get kit data by SKU
 */
export const getKitBySku = (sku) => {
  return kitData.kits.find(kit => kit.sku === sku);
};

/**
 * Get all kits that use a specific box dimension
 */
export const getKitsByBoxDimensions = (width, length, height) => {
  return kitData.kits.filter(kit => 
    kit.box.dimensions.width === width &&
    kit.box.dimensions.length === length &&
    kit.box.dimensions.height === height
  );
};

/**
 * Calculate how many items of given dimensions can fit in a box
 */
export const calculateFitCount = (boxDims, itemDims) => {
  const fitsAlongWidth = Math.floor(boxDims.width / itemDims.width);
  const fitsAlongLength = Math.floor(boxDims.length / itemDims.length);
  const fitsAlongHeight = Math.floor(boxDims.height / itemDims.height);
  
  return fitsAlongWidth * fitsAlongLength * fitsAlongHeight;
};

/**
 * Calculate box utilization percentage
 */
export const calculateUtilization = (boxVolume, itemVolume, itemCount) => {
  return (itemVolume * itemCount) / boxVolume;
};

/**
 * Find the optimal box orientation for a given item
 */
export const findOptimalOrientation = (boxDims, itemDims) => {
  const orientations = [
    { w: itemDims.width, l: itemDims.length, h: itemDims.height, name: 'standard' },
    { w: itemDims.length, l: itemDims.width, h: itemDims.height, name: 'rotated WL' },
    { w: itemDims.width, l: itemDims.height, h: itemDims.length, name: 'rotated LH' },
    { w: itemDims.height, l: itemDims.width, h: itemDims.length, name: 'rotated HW' },
    { w: itemDims.length, l: itemDims.height, h: itemDims.width, name: 'rotated LH-WL' },
    { w: itemDims.height, l: itemDims.length, h: itemDims.width, name: 'rotated HW-L' }
  ];
  
  let maxCount = 0;
  let bestOrientation = null;
  
  orientations.forEach(orientation => {
    const count = calculateFitCount(boxDims, orientation);
    if (count > maxCount) {
      maxCount = count;
      bestOrientation = { ...orientation, count };
    }
  });
  
  return bestOrientation;
};

/**
 * Analyze squish efficiency for a kit
 */
export const analyzeSquishEfficiency = (kit) => {
  const boxVolume = kit.box.volume;
  const squishedVolume = kit.squished.volume;
  const originalVolume = kit.original.volume;
  const quantity = kit.quantity;
  
  const currentSquishedUtil = calculateUtilization(boxVolume, squishedVolume, quantity);
  const theoreticalOriginalUtil = calculateUtilization(boxVolume, originalVolume, quantity);
  
  return {
    currentSquishedUtil,
    theoreticalOriginalUtil,
    squishBenefit: currentSquishedUtil - theoreticalOriginalUtil,
    volumeSavings: (originalVolume - squishedVolume) * quantity,
    squishFactor: kit.calculations.squishFactor
  };
};

/**
 * Get kits sorted by squish factor (most compressible first)
 */
export const getKitsBySquishFactor = (descending = true) => {
  return [...kitData.kits].sort((a, b) => {
    const factorA = a.calculations.squishFactor;
    const factorB = b.calculations.squishFactor;
    return descending ? factorB - factorA : factorA - factorB;
  });
};

/**
 * Get kits sorted by box utilization (worst first)
 */
export const getKitsByUtilization = (ascending = true) => {
  return [...kitData.kits].sort((a, b) => {
    const utilA = a.calculations.utilizationBox;
    const utilB = b.calculations.utilizationBox;
    return ascending ? utilA - utilB : utilB - utilA;
  });
};

/**
 * Find potential box size improvements for a specific kit
 */
export const findBetterBoxSize = (kit, minDim = 12, maxDim = 20, step = 0.5) => {
  const itemDims = kit.squished.dimensions;
  const currentUtil = kit.calculations.utilizationBox;
  const quantity = kit.quantity;
  
  let bestOption = null;
  
  for (let w = minDim; w <= maxDim; w += step) {
    for (let l = minDim; l <= maxDim; l += step) {
      for (let h = minDim; h <= maxDim; h += step) {
        const boxDims = { width: w, length: l, height: h };
        const orientation = findOptimalOrientation(boxDims, itemDims);
        
        if (orientation && orientation.count >= quantity) {
          const boxVolume = calculateVolume(boxDims);
          const util = calculateUtilization(boxVolume, kit.squished.volume, quantity);
          
          if (util > currentUtil) {
            if (!bestOption || util > bestOption.utilization) {
              bestOption = {
                dimensions: boxDims,
                orientation: orientation.name,
                count: orientation.count,
                utilization: util,
                improvement: util - currentUtil,
                volume: boxVolume
              };
            }
          }
        }
      }
    }
  }
  
  return bestOption;
};

/**
 * Get summary statistics for all kits
 */
export const getKitSummaryStats = () => {
  const kits = kitData.kits;
  
  return {
    totalKits: kits.length,
    averageSquishFactor: kits.reduce((sum, kit) => sum + kit.calculations.squishFactor, 0) / kits.length,
    averageBoxUtilization: kits.reduce((sum, kit) => sum + kit.calculations.utilizationBox, 0) / kits.length,
    averageVolumeReduction: kits.reduce((sum, kit) => sum + kit.calculations.volumeReduction, 0) / kits.length,
    totalBoxVolume: kits.reduce((sum, kit) => sum + kit.box.volume, 0),
    totalSquishedVolume: kits.reduce((sum, kit) => sum + kit.calculations.totalSquishedVolume, 0),
    totalOriginalVolume: kits.reduce((sum, kit) => sum + kit.calculations.totalOriginalVolume, 0),
    boxSizeDistribution: kits.reduce((acc, kit) => {
      const key = `${kit.box.dimensions.width}x${kit.box.dimensions.length}x${kit.box.dimensions.height}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  };
};

/**
 * Find kits that might benefit from different box sizes
 */
export const findKitsNeedingBoxOptimization = (threshold = 0.75) => {
  return kitData.kits.filter(kit => 
    kit.calculations.utilizationBox < threshold
  ).map(kit => ({
    sku: kit.sku,
    currentUtilization: kit.calculations.utilizationBox,
    potentialImprovement: findBetterBoxSize(kit)
  }));
};

/**
 * Calculate optimal box size for multiple SKUs
 */
export const findOptimalBoxForMultipleSkus = (skuList, options = {}) => {
  const { minDim = 14, maxDim = 22, step = 1 } = options;
  const kits = skuList.map(sku => getKitBySku(sku)).filter(Boolean);
  
  if (kits.length === 0) return null;
  
  let bestBox = null;
  let bestScore = -1;
  
  for (let w = minDim; w <= maxDim; w += step) {
    for (let l = minDim; l <= maxDim; l += step) {
      for (let h = minDim; h <= maxDim; h += step) {
        const boxDims = { width: w, length: l, height: h };
        const boxVolume = calculateVolume(boxDims);
        
        let totalUtilization = 0;
        let canFitAll = true;
        const skuResults = [];
        
        for (const kit of kits) {
          const orientation = findOptimalOrientation(boxDims, kit.squished.dimensions);
          
          if (!orientation || orientation.count < kit.quantity) {
            canFitAll = false;
            break;
          }
          
          const util = calculateUtilization(boxVolume, kit.squished.volume, kit.quantity);
          totalUtilization += util;
          
          skuResults.push({
            sku: kit.sku,
            fits: true,
            count: orientation.count,
            utilization: util
          });
        }
        
        if (canFitAll) {
          const avgUtilization = totalUtilization / kits.length;
          
          if (avgUtilization > bestScore) {
            bestScore = avgUtilization;
            bestBox = {
              dimensions: boxDims,
              avgUtilization,
              volume: boxVolume,
              skuResults
            };
          }
        }
      }
    }
  }
  
  return bestBox;
};

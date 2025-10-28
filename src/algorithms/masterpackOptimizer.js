// Masterpack optimization algorithm

// All possible orientations (6 rotations)
const orientations = [
  { x: 'L', y: 'W', z: 'H' },
  { x: 'L', y: 'H', z: 'W' },
  { x: 'W', y: 'L', z: 'H' },
  { x: 'W', y: 'H', z: 'L' },
  { x: 'H', y: 'L', z: 'W' },
  { x: 'H', y: 'W', z: 'L' }
]

// Calculate internal dimensions from external dimensions
export const calculateInternalDims = (externalDims, wallThickness) => {
  return {
    L: externalDims.L - (2 * wallThickness),
    W: externalDims.W - (2 * wallThickness),
    H: externalDims.H - (2 * wallThickness)
  }
}

// Calculate how many units fit in a given orientation
export const calculateUnitsPerOrientation = (unitDims, internalDims, squishPct = { x: 0, y: 0, z: 0 }) => {
  // Apply squish percentage to unit dimensions
  const adjustedUnitDims = {
    L: unitDims.L * (1 - squishPct.x),
    W: unitDims.W * (1 - squishPct.y),
    H: unitDims.H * (1 - squishPct.z)
  }
  
  // Calculate how many units fit in each dimension
  const nx = Math.floor(internalDims.L / adjustedUnitDims.L)
  const ny = Math.floor(internalDims.W / adjustedUnitDims.W)
  const nz = Math.floor(internalDims.H / adjustedUnitDims.H)
  
  // Don't allow negative or zero counts
  if (nx <= 0 || ny <= 0 || nz <= 0) {
    return { nx: 0, ny: 0, nz: 0, count: 0, utilization: 0 }
  }
  
  return {
    nx,
    ny,
    nz,
    count: nx * ny * nz,
    utilization: (nx * adjustedUnitDims.L * ny * adjustedUnitDims.W * nz * adjustedUnitDims.H) / 
                 (internalDims.L * internalDims.W * internalDims.H)
  }
}

// Find the best arrangement for a SKU in the masterpack
export const findBestArrangement = (sku, masterpackInternalDims, targetMultiples = [48, 42, 36, 30, 24, 20, 18]) => {
  const unitDims = sku.unitDims
  
  // Use global squish percentages or defaults
  const squishPct = { x: 0, y: 0, z: 0 }
  
  let bestArrangement = null
  let bestScore = -1
  
  // Try all orientations
  for (const orientation of orientations) {
    const orientedUnitDims = {
      L: unitDims[orientation.x],
      W: unitDims[orientation.y],
      H: unitDims[orientation.z]
    }
    
    const arrangement = calculateUnitsPerOrientation(orientedUnitDims, masterpackInternalDims, squishPct)
    
    // Skip arrangements with zero count
    if (arrangement.count <= 0) continue
    
    // Score based on how close we are to target multiples
    const closestMultiple = targetMultiples.reduce((closest, multiple) => {
      const currentDiff = Math.abs(multiple - arrangement.count)
      const closestDiff = Math.abs(closest - arrangement.count)
      return currentDiff < closestDiff ? multiple : closest
    }, targetMultiples[0])
    
    // Calculate how close we are to the closest multiple (0-1 score)
    const multipleScore = 1 - (Math.abs(closestMultiple - arrangement.count) / closestMultiple)
    
    // Score based on utilization (0-1)
    const utilizationScore = arrangement.utilization
    
    // Prefer arrangements that hit target multiples exactly
    const exactMultipleBonus = targetMultiples.includes(arrangement.count) ? 0.2 : 0
    
    // Combined score (weighted)
    const score = 0.6 * multipleScore + 0.3 * utilizationScore + 0.1 * exactMultipleBonus
    
    if (score > bestScore) {
      bestScore = score
      bestArrangement = {
        ...arrangement,
        orientation,
        sku: sku.sku,
        score
      }
    }
  }
  
  return bestArrangement
}

// Calculate pallet stacking with lacing patterns
export const calculatePalletStacking = (masterpackExternalDims, globalSettings) => {
  const { pallet, targetPalletHeight } = globalSettings
  const { L, W, H } = masterpackExternalDims
  
  // Calculate how many cases fit in each dimension on the pallet
  const casesWide = Math.floor(pallet.width / W)
  const casesLong = Math.floor(pallet.length / L)
  
  // Check overhang
  const overhangWidth = pallet.width - (casesWide * W)
  const overhangLength = pallet.length - (casesLong * L)
  
  // Calculate maximum layers based on height
  const availableHeight = targetPalletHeight.value - pallet.height
  const maxLayers = Math.floor(availableHeight / H)
  
  // Calculate actual pallet height
  const actualPalletHeight = pallet.height + (maxLayers * H)
  
  // Calculate overhang flags
  const overhangWidthFlag = overhangWidth > 0.5
  const overhangLengthFlag = overhangLength > 0.5
  
  return {
    casesWide,
    casesLong,
    casesPerLayer: casesWide * casesLong,
    maxLayers,
    totalCases: casesWide * casesLong * maxLayers,
    palletHeight: actualPalletHeight,
    overhangWidth,
    overhangLength,
    overhangWidthFlag,
    overhangLengthFlag,
    coverage: (casesWide * W * casesLong * L) / (pallet.width * pallet.length)
  }
}

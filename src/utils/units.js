// Unit conversion utilities

// Length conversions
export const inToMm = (inches) => inches * 25.4;
export const mmToIn = (mm) => mm / 25.4;

// Weight conversions
export const ozToG = (oz) => oz * 28.3495;
export const gToOz = (g) => g / 28.3495;
export const lbToKg = (lb) => lb * 0.453592;
export const kgToLb = (kg) => kg / 0.453592;
export const ozToLb = (oz) => oz / 16;
export const lbToOz = (lb) => lb * 16;

// Format dimensions in both units
export const formatDimension = (inches, decimals = 2) => {
  const mm = inToMm(inches);
  return `${inches.toFixed(decimals)} in • ${mm.toFixed(decimals)} mm`;
};

// Format weight in both units
export const formatWeight = (lb, decimals = 1) => {
  const kg = lbToKg(lb);
  return `${lb.toFixed(decimals)} lb • ${kg.toFixed(decimals)} kg`;
};

// Format dimensions object
export const formatDims = (dims, decimals = 2) => {
  return {
    imperial: `${dims.L.toFixed(decimals)} × ${dims.W.toFixed(decimals)} × ${dims.H.toFixed(decimals)} in`,
    metric: `${inToMm(dims.L).toFixed(decimals)} × ${inToMm(dims.W).toFixed(decimals)} × ${inToMm(dims.H).toFixed(decimals)} mm`,
    both: `${dims.L.toFixed(decimals)} × ${dims.W.toFixed(decimals)} × ${dims.H.toFixed(decimals)} in • ${inToMm(dims.L).toFixed(decimals)} × ${inToMm(dims.W).toFixed(decimals)} × ${inToMm(dims.H).toFixed(decimals)} mm`
  };
};

// Unit conversion utilities
export const INCH_TO_MM = 25.4
export const OZ_TO_G = 28.3495
export const LB_TO_KG = 0.453592

// Convert dimensions to mm
export const convertToMM = (value, unit) => {
  switch (unit) {
    case 'in':
      return value * INCH_TO_MM
    case 'mm':
      return value
    case 'cm':
      return value * 10
    default:
      return value
  }
}

// Convert dimensions from mm to desired unit
export const convertFromMM = (value, unit) => {
  switch (unit) {
    case 'in':
      return value / INCH_TO_MM
    case 'mm':
      return value
    case 'cm':
      return value / 10
    default:
      return value
  }
}

// Convert weight to grams
export const convertToGrams = (value, unit) => {
  switch (unit) {
    case 'oz':
      return value * OZ_TO_G
    case 'lb':
      return value * LB_TO_KG * 1000 // Convert to grams
    case 'g':
      return value
    case 'kg':
      return value * 1000
    default:
      return value
  }
}

// Convert weight from grams to desired unit
export const convertFromGrams = (value, unit) => {
  switch (unit) {
    case 'oz':
      return value / OZ_TO_G
    case 'lb':
      return value / 1000 / LB_TO_KG
    case 'g':
      return value
    case 'kg':
      return value / 1000
    default:
      return value
  }
}

// Format unit display
export const formatUnit = (value, unit, decimals = 2) => {
  return `${value.toFixed(decimals)} ${unit}`
}

// Format dual unit display
export const formatDualUnit = (mmValue, primaryUnit, secondaryUnit, decimals = 2) => {
  const primaryValue = convertFromMM(mmValue, primaryUnit)
  const secondaryValue = convertFromMM(mmValue, secondaryUnit)
  
  return `${primaryValue.toFixed(decimals)} ${primaryUnit} (${secondaryValue.toFixed(decimals)} ${secondaryUnit})`
}

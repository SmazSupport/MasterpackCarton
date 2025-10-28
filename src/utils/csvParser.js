// CSV parser utility

// Parse CSV data into SKU objects
export const parseCSV = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim() !== '')
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(header => header.trim())
  const skus = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(value => value.trim())
    if (values.length !== headers.length) continue
    
    const sku = {}
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j]
      const value = values[j]
      
      // Handle specific fields
      if (header === 'sku') {
        sku.sku = value
      } else if (header.startsWith('unit_')) {
        // Parse unit dimensions and weight
        if (!sku.unitDims) sku.unitDims = { units: 'in' }
        if (!sku.unitWeight) sku.unitWeight = { units: 'oz' }
        
        if (header === 'unit_L') {
          sku.unitDims.L = parseFloat(value) || 0
        } else if (header === 'unit_W') {
          sku.unitDims.W = parseFloat(value) || 0
        } else if (header === 'unit_H') {
          sku.unitDims.H = parseFloat(value) || 0
        } else if (header === 'unit_units') {
          sku.unitDims.units = value
        } else if (header === 'unit_weight_value') {
          sku.unitWeight.value = parseFloat(value) || 0
        } else if (header === 'unit_weight_units') {
          sku.unitWeight.units = value
        }
      } else if (header === 'notes') {
        sku.notes = value
      }
    }
    
    // Only add SKU if it has the required fields
    if (sku.sku && sku.unitDims && sku.unitWeight) {
      skus.push(sku)
    }
  }
  
  return skus
}

// Convert SKU data to CSV format
export const skusToCSV = (skus) => {
  if (!skus || skus.length === 0) return ''
  
  // Create headers
  const headers = [
    'sku',
    'unit_L',
    'unit_W',
    'unit_H',
    'unit_units',
    'unit_weight_value',
    'unit_weight_units',
    'notes'
  ]
  
  // Create rows
  const rows = skus.map(sku => [
    sku.sku,
    sku.unitDims.L,
    sku.unitDims.W,
    sku.unitDims.H,
    sku.unitDims.units,
    sku.unitWeight.value,
    sku.unitWeight.units,
    sku.notes || ''
  ])
  
  // Combine headers and rows
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
}

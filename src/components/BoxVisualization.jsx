import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo } from 'react'

// Simple box component
const BoxComponent = ({ position, dimensions, color = '#1f77b4' }) => {
  // Convert dimensions to ensure they're positive
  const dims = {
    width: Math.abs(dimensions?.width || 1),
    height: Math.abs(dimensions?.height || 1),
    depth: Math.abs(dimensions?.depth || 1)
  }
  
  return (
    <mesh position={position}>
      <boxGeometry args={[dims.width, dims.height, dims.depth]} />
      <meshStandardMaterial color={color} wireframe={false} />
    </mesh>
  )
}

// Wireframe box component
const WireframeBox = ({ position, dimensions, color = '#ff7f0e' }) => {
  // Convert dimensions to ensure they're positive
  const dims = {
    width: Math.abs(dimensions?.width || 1),
    height: Math.abs(dimensions?.height || 1),
    depth: Math.abs(dimensions?.depth || 1)
  }
  
  return (
    <mesh position={position}>
      <boxGeometry args={[dims.width, dims.height, dims.depth]} />
      <meshStandardMaterial color={color} wireframe={true} />
    </mesh>
  )
}

// Visualization of a single SKU arrangement in a masterpack
const SkuArrangementVisualization = ({ sku, arrangement }) => {
  // Add error handling
  if (!sku || !arrangement || !arrangement.orientation) {
    return <div className="visualization-container">Select a SKU to see visualization</div>
  }
  
  const unitDims = sku.unitDims
  const orientedUnitDims = {
    width: unitDims[arrangement.orientation.x],
    height: unitDims[arrangement.orientation.y],
    depth: unitDims[arrangement.orientation.z]
  }
  
  // Calculate positions for each unit
  const units = useMemo(() => {
    // Validate inputs
    if (!arrangement.nx || !arrangement.ny || !arrangement.nz) {
      return []
    }
    
    const unitsArray = []
    const spacing = 0.05 // Small gap between units for visualization
    
    for (let x = 0; x < arrangement.nx; x++) {
      for (let y = 0; y < arrangement.ny; y++) {
        for (let z = 0; z < arrangement.nz; z++) {
          const position = [
            (x * orientedUnitDims.width) + (orientedUnitDims.width / 2) - ((arrangement.nx * orientedUnitDims.width) / 2),
            (y * orientedUnitDims.height) + (orientedUnitDims.height / 2) - ((arrangement.ny * orientedUnitDims.height) / 2),
            (z * orientedUnitDims.depth) + (orientedUnitDims.depth / 2) - ((arrangement.nz * orientedUnitDims.depth) / 2)
          ]
          
          unitsArray.push({
            id: `${x}-${y}-${z}`,
            position,
            dimensions: orientedUnitDims
          })
        }
      }
    }
    
    return unitsArray
  }, [sku, arrangement])
  
  // Calculate masterpack dimensions
  const masterpackDims = {
    width: orientedUnitDims.width * arrangement.nx,
    height: orientedUnitDims.height * arrangement.ny,
    depth: orientedUnitDims.depth * arrangement.nz
  }
  
  return (
    <div className="visualization-container">
      <h3>SKU Arrangement in Masterpack</h3>
      <div style={{ height: '300px', width: '100%' }}>
        <Canvas camera={{ position: [Math.max(masterpackDims.width, masterpackDims.height, masterpackDims.depth) * 2, Math.max(masterpackDims.width, masterpackDims.height, masterpackDims.depth) * 2, Math.max(masterpackDims.width, masterpackDims.height, masterpackDims.depth) * 2], fov: 50 }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            
            {/* Masterpack wireframe */}
            <WireframeBox 
              position={[0, 0, 0]} 
              dimensions={masterpackDims} 
              color="#ff7f0e" 
            />
            
            {/* Individual units */}
            {units.map(unit => (
              <BoxComponent 
                key={unit.id}
                position={unit.position}
                dimensions={unit.dimensions}
                color="#1f77b4"
              />
            ))}
            
            <OrbitControls />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}

// Visualization of pallet stacking
const PalletStackingVisualization = ({ palletStacking, masterpackExternalDims }) => {
  // Add error handling
  if (!palletStacking || !masterpackExternalDims) {
    return <div className="visualization-container">No pallet stacking data available</div>
  }
  
  const layers = useMemo(() => {
    // Validate inputs
    if (!palletStacking.maxLayers || !palletStacking.casesWide || !palletStacking.casesLong) {
      return []
    }
    
    const layersArray = []
    
    // Only create visualization for up to 10 layers to avoid performance issues
    const maxLayersToVisualize = Math.min(palletStacking.maxLayers, 10)
    
    for (let layer = 0; layer < maxLayersToVisualize; layer++) {
      for (let x = 0; x < palletStacking.casesWide; x++) {
        for (let y = 0; y < palletStacking.casesLong; y++) {
          const position = [
            (x * masterpackExternalDims.W) + (masterpackExternalDims.W / 2) - (40 / 2),
            (layer * masterpackExternalDims.H) + (masterpackExternalDims.H / 2),
            (y * masterpackExternalDims.L) + (masterpackExternalDims.L / 2) - (48 / 2)
          ]
          
          layersArray.push({
            id: `${layer}-${x}-${y}`,
            position,
            dimensions: {
              width: masterpackExternalDims.W,
              height: masterpackExternalDims.H,
              depth: masterpackExternalDims.L
            }
          })
        }
      }
    }
    
    return layersArray
  }, [palletStacking, masterpackExternalDims])
  
  return (
    <div className="visualization-container">
      <h3>Pallet Stacking</h3>
      <div style={{ height: '300px', width: '100%' }}>
        <Canvas camera={{ position: [70, 50, 70], fov: 50 }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <pointLight position={[100, 100, 100]} />
            
            {/* Pallet base */}
            <BoxComponent 
              position={[0, -2.5, 0]} 
              dimensions={{ width: 40, height: 5, depth: 48 }} 
              color="#8c564b" 
            />
            
            {/* Masterpack cases */}
            {layers.map(caseItem => (
              <BoxComponent 
                key={caseItem.id}
                position={caseItem.position}
                dimensions={caseItem.dimensions}
                color="#1f77b4"
              />
            ))}
            
            <OrbitControls />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}

export { SkuArrangementVisualization, PalletStackingVisualization }

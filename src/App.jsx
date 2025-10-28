import { useState, useMemo } from 'react'
import './App.css'
import SkuSearch from './components/SkuSearch'
import { sampleData } from './data/productData'
import { findBestArrangement, calculateInternalDims, calculatePalletStacking } from './algorithms/masterpackOptimizer'
import { SkuArrangementVisualization, PalletStackingVisualization } from './components/BoxVisualization'
import { parseCSV } from './utils/csvParser'
import ExportButton from './components/ExportButton'

function App() {
  // State for product data
  const [productData, setProductData] = useState(sampleData)
  
  // State for selected SKU
  const [selectedSku, setSelectedSku] = useState(null)
  
  // State for recently viewed SKUs
  const [recentSkus, setRecentSkus] = useState([])
  
  // State for unit system (imperial/metric)
  const [unitSystem, setUnitSystem] = useState('imperial')
  
  // Calculate masterpack internal dimensions
  const masterpackInternalDims = useMemo(() => {
    const externalDims = productData.masterpackCandidate.externalDims
    const wallThickness = productData.global.corrugateWallThickness.value
    return calculateInternalDims(externalDims, wallThickness)
  }, [productData])
  
  // Handle SKU selection
  const handleSkuSelect = (sku) => {
    setSelectedSku(sku)
    
    // Add to recent SKUs (limit to 5)
    if (!recentSkus.some(recent => recent.sku === sku.sku)) {
      setRecentSkus(prev => [sku, ...prev].slice(0, 5))
    }
  }
  
  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          if (file.name.endsWith('.json')) {
            const data = JSON.parse(e.target.result)
            setProductData(data)
          } else if (file.name.endsWith('.csv')) {
            const skus = parseCSV(e.target.result)
            setProductData(prev => ({
              ...prev,
              skus
            }))
          } else {
            alert('Unsupported file format. Please upload a JSON or CSV file.')
          }
        } catch (error) {
          console.error('Error parsing file:', error)
          alert('Error parsing file. Please check the format.')
        }
      }
      reader.readAsText(file)
    }
  }
  
  // Get arrangement for selected SKU
  const skuArrangement = useMemo(() => {
    if (!selectedSku) return null
    return findBestArrangement(selectedSku, masterpackInternalDims)
  }, [selectedSku, masterpackInternalDims])
  
  // Calculate pallet stacking
  const palletStacking = useMemo(() => {
    const externalDims = productData.masterpackCandidate.externalDims
    return calculatePalletStacking(externalDims, productData.global)
  }, [productData])

  return (
    <div className="app">
      <header>
        <h1>Box Product Configuration Tool</h1>
        
        <div className="controls">
          <div className="unit-toggle">
            <label>
              <input
                type="radio"
                value="imperial"
                checked={unitSystem === 'imperial'}
                onChange={() => setUnitSystem('imperial')}
              />
              Imperial
            </label>
            <label>
              <input
                type="radio"
                value="metric"
                checked={unitSystem === 'metric'}
                onChange={() => setUnitSystem('metric')}
              />
              Metric
            </label>
          </div>
          
          <div className="file-upload">
            <input 
              type="file" 
              accept=".json,.csv" 
              onChange={handleFileUpload} 
            />
          </div>
          
          <div className="export-button">
            <ExportButton skus={productData.skus} fileName="box-config-export" />
          </div>
        </div>
      </header>
      
      <main>
        <div className="search-section">
          <SkuSearch 
            skus={productData.skus}
            onSkuSelect={handleSkuSelect}
            recentSkus={recentSkus}
          />
        </div>
        
        <div className="results-section">
          {selectedSku && skuArrangement && (
            <div className="sku-results">
              <h2>SKU: {selectedSku.sku}</h2>
              <div className="arrangement-details">
                <p>Best arrangement: {skuArrangement.nx} × {skuArrangement.ny} × {skuArrangement.nz} = {skuArrangement.count} units</p>
                <p>Orientation: X→{skuArrangement.orientation.x}, Y→{skuArrangement.orientation.y}, Z→{skuArrangement.orientation.z}</p>
                <p>Utilization: {(skuArrangement.utilization * 100).toFixed(1)}%</p>
              </div>
              
              {selectedSku && skuArrangement && (
                <div className="visualization">
                  <SkuArrangementVisualization sku={selectedSku} arrangement={skuArrangement} />
                </div>
              )}
            </div>
          )}
          
          <div className="masterpack-details">
            <h2>Masterpack Details</h2>
            <p>External dimensions: {productData.masterpackCandidate.externalDims.L}" × {productData.masterpackCandidate.externalDims.W}" × {productData.masterpackCandidate.externalDims.H}"</p>
            <p>Internal dimensions: {masterpackInternalDims.L.toFixed(2)}" × {masterpackInternalDims.W.toFixed(2)}" × {masterpackInternalDims.H.toFixed(2)}"</p>
          </div>
          
          <div className="pallet-details">
            <h2>Pallet Stacking</h2>
            <p>Cases per layer: {palletStacking.casesPerLayer} ({palletStacking.casesWide} wide × {palletStacking.casesLong} long)</p>
            <p>Layers: {palletStacking.maxLayers}</p>
            <p>Total cases per pallet: {palletStacking.totalCases}</p>
            <p>Pallet height: {palletStacking.palletHeight.toFixed(2)}"</p>
            <p>Coverage: {(palletStacking.coverage * 100).toFixed(1)}%</p>
            
            {palletStacking && productData.masterpackCandidate.externalDims && (
              <div className="visualization">
                <PalletStackingVisualization 
                  palletStacking={palletStacking} 
                  masterpackExternalDims={productData.masterpackCandidate.externalDims} 
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App

import { useState, useMemo, useEffect } from 'react'
import './App.css'
import { findBestArrangement } from './solver/innerPack'
import { findBestPalletPattern } from './solver/palletizer'
import { formatDims, formatWeight } from './utils/units'

function App() {
  // State for configuration and SKU data
  const [config, setConfig] = useState(null)
  const [skus, setSkus] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // State for user inputs
  const [targetPalletHeight, setTargetPalletHeight] = useState(64)
  const [unitSystem, setUnitSystem] = useState('both')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSku, setSelectedSku] = useState(null)
  const [recentSkus, setRecentSkus] = useState([])
  const [selectedPattern, setSelectedPattern] = useState('column')
  
  // Load static data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [configRes, skusRes] = await Promise.all([
          fetch('./data/config.json'),
          fetch('./data/skus.json')
        ]);
        
        if (!configRes.ok || !skusRes.ok) {
          throw new Error('Failed to load data files');
        }
        
        const configData = await configRes.json();
        const skusData = await skusRes.json();
        
        setConfig(configData);
        setSkus(skusData);
        setTargetPalletHeight(configData.default_pallet_height);
        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Handle SKU selection
  const handleSkuSelect = (sku) => {
    setSelectedSku(sku)
    setSearchTerm(sku.sku)
    
    // Add to recent SKUs (limit to 5)
    if (!recentSkus.some(recent => recent.sku === sku.sku)) {
      setRecentSkus(prev => [sku, ...prev].slice(0, 5))
    }
  }
  
  // Filter SKUs based on search term
  const filteredSkus = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return skus
      .filter(sku => sku.sku.toLowerCase().includes(term))
      .slice(0, 10);
  }, [searchTerm, skus]);
  
  // Calculate arrangement for selected SKU
  const arrangement = useMemo(() => {
    if (!selectedSku || !config) return null;
    return findBestArrangement(selectedSku, config);
  }, [selectedSku, config]);
  
  // Calculate pallet stacking
  const palletStacking = useMemo(() => {
    if (!arrangement || !arrangement.fits || !config) return null;
    
    const caseDims = {
      L: config.masterpack.external.L,
      W: config.masterpack.external.W,
      H: config.masterpack.external.H
    };
    
    return findBestPalletPattern(caseDims, config, targetPalletHeight);
  }, [arrangement, config, targetPalletHeight]);

  if (loading) {
    return <div className="app loading">Loading configuration...</div>;
  }
  
  if (error) {
    return <div className="app error">Error: {error}</div>;
  }
  
  return (
    <div className="app">
      <header>
        <h1>Masterpack Configuration Tool</h1>
        
        <div className="controls">
          <div className="control-group">
            <label>Target Pallet Height (in):</label>
            <input
              type="number"
              value={targetPalletHeight}
              onChange={(e) => setTargetPalletHeight(Number(e.target.value))}
              min="40"
              max="100"
              step="1"
            />
          </div>
          
          <div className="control-group">
            <label>Units:</label>
            <select value={unitSystem} onChange={(e) => setUnitSystem(e.target.value)}>
              <option value="imperial">Imperial</option>
              <option value="metric">Metric</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>
      </header>
      
      <main>
        <div className="search-section">
          <div className="search-box">
            <label>Search SKU:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type SKU name..."
            />
            
            {filteredSkus.length > 0 && searchTerm && (
              <div className="search-results">
                {filteredSkus.map(sku => (
                  <div
                    key={sku.sku}
                    className="search-result-item"
                    onClick={() => handleSkuSelect(sku)}
                  >
                    {sku.sku} ({sku.L}×{sku.W}×{sku.H} in)
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {recentSkus.length > 0 && (
            <div className="recent-skus">
              <label>Recent:</label>
              {recentSkus.map(sku => (
                <button
                  key={sku.sku}
                  onClick={() => handleSkuSelect(sku)}
                  className="recent-sku-btn"
                >
                  {sku.sku}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {selectedSku && arrangement && (
          <div className="results-section">
            {arrangement.fits ? (
              <>
                <div className="case-view">
                  <h2>Case View: {selectedSku.sku}</h2>
                  
                  {selectedSku.current_baseline && (
                    <div className="baseline">
                      <strong>Current baseline:</strong> {selectedSku.current_baseline} units per case
                    </div>
                  )}
                  
                  <div className="arrangement-details">
                    <div className="stat">
                      <strong>Arrangement:</strong> {arrangement.nx} × {arrangement.ny} × {arrangement.nz} = {arrangement.count} units
                    </div>
                    <div className="stat">
                      <strong>Rotation:</strong> {arrangement.rotation}
                    </div>
                    <div className="stat">
                      <strong>Utilization:</strong> {(arrangement.utilization * 100).toFixed(1)}%
                    </div>
                    <div className="stat">
                      <strong>Gross case weight:</strong> {formatWeight(arrangement.grossCaseWeight)}
                    </div>
                    
                    {arrangement.isLowDensity && (
                      <div className="warning">⚠️ Low pack density (&lt; 20 units)</div>
                    )}
                    {arrangement.isHeavy && (
                      <div className="warning">⚠️ Heavy case (&gt; 40 lb)</div>
                    )}
                  </div>
                  
                  <div className="dimensions">
                    <h3>Masterpack Dimensions</h3>
                    <div className="stat">
                      <strong>External:</strong> {formatDims(config.masterpack.external)[unitSystem]}
                    </div>
                    <div className="stat">
                      <strong>Internal:</strong> {formatDims(arrangement.internalDims)[unitSystem]}
                    </div>
                  </div>
                </div>
                
                {palletStacking && (
                  <div className="pallet-view">
                    <h2>Pallet View</h2>
                    
                    <div className="pallet-details">
                      <div className="stat">
                        <strong>Pattern:</strong> {palletStacking.pattern}
                      </div>
                      <div className="stat">
                        <strong>Cases per layer:</strong> {palletStacking.casesPerLayer} ({palletStacking.casesWide} wide × {palletStacking.casesLong} long)
                      </div>
                      <div className="stat">
                        <strong>Layers (tie-high):</strong> {palletStacking.maxLayers}
                      </div>
                      <div className="stat">
                        <strong>Total cases:</strong> {palletStacking.totalCases}
                      </div>
                      <div className="stat">
                        <strong>Pallet height:</strong> {palletStacking.palletHeight.toFixed(2)} in
                      </div>
                      <div className="stat">
                        <strong>Coverage:</strong> {(palletStacking.coverage * 100).toFixed(1)}%
                      </div>
                      
                      {palletStacking.exceedsOverhang && (
                        <div className="warning">⚠️ Overhang exceeds limit ({config.solver.max_overhang_in} in)</div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="no-fit">
                <h2>SKU Does Not Fit</h2>
                <p>{arrangement.reason}</p>
                <p>Failing axis: {arrangement.failingAxis.join(', ')}</p>
              </div>
            )}
          </div>
        )}
        
        {!selectedSku && (
          <div className="empty-state">
            <p>Search for a SKU to see packing analysis</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App

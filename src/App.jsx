import { useState, useMemo, useEffect } from 'react'
import './App.css'
import { analyzeCurrentMasterpack, findOptimalMasterpack } from './solver/multiSkuOptimizer'
import { formatDims, formatWeight } from './utils/units'
import { getKitSummaryStats, getKitsBySquishFactor, getKitsByUtilization } from './utils/kitAnalysis'

function App() {
  // State for configuration and SKU data
  const [config, setConfig] = useState(null)
  const [skus, setSkus] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // State for optimization
  const [targetPalletHeight, setTargetPalletHeight] = useState(64)
  const [optimizing, setOptimizing] = useState(false)
  const [optimalResults, setOptimalResults] = useState(null)
  
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
  
  // Analyze current masterpack
  const currentAnalysis = useMemo(() => {
    if (!config || !skus.length) return null;
    return analyzeCurrentMasterpack(skus, config);
  }, [config, skus]);
  
  // Get kit statistics
  const kitStats = useMemo(() => {
    if (!skus.length) return null;
    return getKitSummaryStats();
  }, [skus]);
  
  // Find optimal box
  const handleFindOptimalBox = () => {
    if (!config || !skus.length) return;
    
    setOptimizing(true);
    
    // Run optimization in next tick to allow UI to update
    setTimeout(() => {
      const results = findOptimalMasterpack(skus, config, {
        minDim: 14,
        maxDim: 22,
        step: 0.5
      });
      setOptimalResults(results);
      setOptimizing(false);
    }, 100);
  };
  
  if (loading) {
    return <div className="app loading">Loading kit measurement data...</div>;
  }
  
  if (error) {
    return <div className="app error">Error: {error}</div>;
  }
  
  return (
    <div className="app">
      <header className="app-header">
        <h1>📦 Single Box Optimizer</h1>
        <p className="subtitle">Find the optimal box size for ALL products with pallet interlocking</p>
      </header>
      
      {/* Section 1: Data Overview */}
      <section className="data-overview">
        <h2>📊 Product Data Overview</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{skus.length}</div>
            <div className="stat-label">Total Products</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{kitStats?.averageSquishFactor.toFixed(3)}</div>
            <div className="stat-label">Avg Squish Factor</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{(kitStats?.averageBoxUtilization * 100).toFixed(1)}%</div>
            <div className="stat-label">Avg Box Utilization</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{Object.keys(kitStats?.boxSizeDistribution || {}).length}</div>
            <div className="stat-label">Different Box Sizes</div>
          </div>
        </div>
        
        <div className="data-table">
          <h3>All Kit Measurements</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Squished Size</th>
                  <th>Original Size</th>
                  <th>Box Size</th>
                  <th>Box Util</th>
                  <th>Squish Factor</th>
                  <th>Weight</th>
                </tr>
              </thead>
              <tbody>
                {skus.map(sku => (
                  <tr key={sku.sku}>
                    <td className="sku-name">{sku.sku}</td>
                    <td>{sku.current_baseline}</td>
                    <td>{sku.L}×{sku.W}×{sku.H}</td>
                    <td>{sku.L}×{sku.W}×{sku.original_H}</td>
                    <td>{sku.box_dims ? `${sku.box_dims.L}×${sku.box_dims.W}×${sku.box_dims.H}` : 'N/A'}</td>
                    <td className={currentAnalysis?.results.find(r => r.sku === sku.sku)?.boxUtilization < 0.75 ? 'low-util' : ''}>
                      {currentAnalysis?.results.find(r => r.sku === sku.sku)?.boxUtilization 
                        ? `${(currentAnalysis.results.find(r => r.sku === sku.sku).boxUtilization * 100).toFixed(1)}%`
                        : 'N/A'}
                    </td>
                    <td>{sku.squish_factor.toFixed(3)}</td>
                    <td>{sku.oz}oz</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      
      {/* Section 2: Pallet Configuration */}
      <section className="pallet-config">
        <h2>🏗️ Pallet Configuration & Constraints</h2>
        <div className="pallet-info">
          <div className="pallet-dims">
            <h3>Standard Pallet</h3>
            <div className="dim-display">
              <span className="dim">{config.pallet.L}" × {config.pallet.W}"</span>
              <span className="dim-label">Length × Width</span>
            </div>
          </div>
          
          <div className="pallet-height">
            <h3>Max Stack Height</h3>
            <div className="height-control">
              <input
                type="range"
                min="48"
                max="96"
                step="2"
                value={targetPalletHeight}
                onChange={(e) => setTargetPalletHeight(Number(e.target.value))}
                className="height-slider"
              />
              <div className="height-display">
                <span className="height-value">{targetPalletHeight}"</span>
                <span className="height-label">inches</span>
              </div>
            </div>
          </div>
          
          <div className="interlocking-info">
            <h3>🔄 Interlocking Requirement</h3>
            <p>Boxes must fit in both orientations for stable alternating layers:</p>
            <div className="orientation-display">
              <div className="orientation">
                <span>Layer 1: {config.masterpack.external.L} × {config.masterpack.external.W}</span>
              </div>
              <div className="orientation">
                <span>Layer 2: {config.masterpack.external.W} × {config.masterpack.external.L}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Section 3: Single Box Optimizer */}
      <section className="box-optimizer">
        <h2>🎯 Find Optimal Box Size</h2>
        <div className="optimizer-controls">
          <div className="optimization-summary">
            <p>Find <strong>ONE</strong> box size that fits all {skus.length} products while enabling pallet interlocking within {targetPalletHeight}" height limit.</p>
          </div>
          <button 
            className="optimize-btn-primary"
            onClick={handleFindOptimalBox}
            disabled={optimizing || !config}
          >
            {optimizing ? '🔄 Finding Optimal Box...' : '🚀 Find Optimal Box'}
          </button>
        </div>
        
        {optimalResults && (
          <div className="optimal-result">
            <div className="result-header">
              <h3>✅ Recommended Box Size</h3>
              <div className="recommended-box">
                <span className="box-dims">
                  {optimalResults.optimal.dims.L} × {optimalResults.optimal.dims.W} × {optimalResults.optimal.dims.H} inches
                </span>
              </div>
            </div>
            
            <div className="result-metrics">
              <div className="metric">
                <span className="metric-label">Average Utilization:</span>
                <span className="metric-value">{(optimalResults.optimal.avgUtilization * 100).toFixed(1)}%</span>
              </div>
              <div className="metric">
                <span className="metric-label">Pallet Coverage:</span>
                <span className="metric-value">{(optimalResults.optimal.palletFit.avgCoverage * 100).toFixed(1)}%</span>
              </div>
              <div className="metric">
                <span className="metric-label">Interlocking:</span>
                <span className="metric-value success">
                  {optimalResults.optimal.palletFit.canInterlock ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Layers per Pallet:</span>
                <span className="metric-value">{Math.floor(targetPalletHeight / optimalResults.optimal.dims.H)}</span>
              </div>
            </div>
            
            <div className="pallet-layout">
              <h4>📐 Pallet Layout</h4>
              <div className="layout-info">
                <div className="layer-info">
                  <strong>Layer 1:</strong> {optimalResults.optimal.palletFit.layer1Count} boxes 
                  ({(optimalResults.optimal.palletFit.layer1Coverage * 100).toFixed(1)}% coverage)
                </div>
                <div className="layer-info">
                  <strong>Layer 2:</strong> {optimalResults.optimal.palletFit.layer2Count} boxes 
                  ({(optimalResults.optimal.palletFit.layer2Coverage * 100).toFixed(1)}% coverage)
                </div>
                <div className="total-info">
                  <strong>Total per Pallet:</strong> {Math.floor(targetPalletHeight / optimalResults.optimal.dims.H) * 
                    Math.max(optimalResults.optimal.palletFit.layer1Count, optimalResults.optimal.palletFit.layer2Count)} boxes
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
      
      {/* Section 4: Product Validation */}
      {optimalResults && (
        <section className="product-validation">
          <h2>✅ Product Fit Validation</h2>
          <p>How each product fits in the recommended box:</p>
          <div className="validation-grid">
            {optimalResults.optimal.skuResults.map(result => (
              <div key={result.sku} className={`validation-card ${!result.fits ? 'invalid' : ''}`}>
                <div className="validation-header">
                  <span className="sku-name">{result.sku}</span>
                  <span className={`fit-status ${result.fits ? 'fits' : 'no-fit'}`}>
                    {result.fits ? '✅ Fits' : '❌ No Fit'}
                  </span>
                </div>
                <div className="validation-details">
                  <div className="detail">
                    <span>Quantity:</span>
                    <span>{result.count} units</span>
                  </div>
                  <div className="detail">
                    <span>Utilization:</span>
                    <span>{(result.utilization * 100).toFixed(1)}%</span>
                  </div>
                  <div className="detail">
                    <span>vs Current:</span>
                    <span className={result.count >= result.currentBaseline ? 'better' : 'worse'}>
                      {result.currentBaseline > 0 ? `${Math.round((result.count / result.currentBaseline) * 100)}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default App

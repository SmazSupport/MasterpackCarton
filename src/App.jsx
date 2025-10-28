import { useState, useMemo, useEffect } from 'react'
import './App.css'
import { analyzeCurrentMasterpack, findOptimalMasterpack } from './solver/multiSkuOptimizer'
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
  const [view, setView] = useState('current') // 'current' or 'optimal'
  const [optimizing, setOptimizing] = useState(false)
  
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
  
  // State for optimal masterpack results
  const [optimalResults, setOptimalResults] = useState(null);
  
  // Find optimal masterpack
  const handleOptimize = () => {
    if (!config || !skus.length) return;
    
    setOptimizing(true);
    
    // Run optimization in next tick to allow UI to update
    setTimeout(() => {
      const results = findOptimalMasterpack(skus, config, {
        minDim: 14,
        maxDim: 22,
        step: 1
      });
      setOptimalResults(results);
      setOptimizing(false);
      setView('optimal');
    }, 100);
  };

  if (loading) {
    return <div className="app loading">Loading configuration...</div>;
  }
  
  if (error) {
    return <div className="app error">Error: {error}</div>;
  }
  
  return (
    <div className="app">
      <header>
        <h1>Masterpack Optimization Dashboard</h1>
        
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
          
          <button 
            className="optimize-btn"
            onClick={handleOptimize}
            disabled={optimizing || !config}
          >
            {optimizing ? 'Optimizing...' : 'Find Optimal Box Size'}
          </button>
        </div>
      </header>
      
      <main>
        <div className="view-tabs">
          <button 
            className={view === 'current' ? 'tab active' : 'tab'}
            onClick={() => setView('current')}
          >
            Current Masterpack (20×15×14)
          </button>
          <button 
            className={view === 'optimal' ? 'tab active' : 'tab'}
            onClick={() => setView('optimal')}
            disabled={!optimalResults}
          >
            Optimal Masterpack {optimalResults && `(${optimalResults.optimal.dims.L}×${optimalResults.optimal.dims.W}×${optimalResults.optimal.dims.H})`}
          </button>
        </div>
        
        {view === 'current' && currentAnalysis && (
          <div className="analysis-section">
            <div className="summary-card">
              <h2>Current Masterpack Analysis</h2>
              <div className="summary-stats">
                <div className="stat-box">
                  <div className="stat-label">Total SKUs</div>
                  <div className="stat-value">{currentAnalysis.summary.totalSkus}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Avg Squish Factor</div>
                  <div className="stat-value">{currentAnalysis.summary.avgSquishFactor.toFixed(2)}x</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Avg Theoretical Util</div>
                  <div className="stat-value">{(currentAnalysis.summary.avgTheoreticalUtil * 100).toFixed(1)}%</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Avg Actual Util</div>
                  <div className="stat-value">{(currentAnalysis.summary.avgActualUtil * 100).toFixed(1)}%</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Problematic SKUs</div>
                  <div className="stat-value">{currentAnalysis.summary.problematicSkus}</div>
                </div>
              </div>
            </div>
            
            <div className="sku-table">
              <h3>SKU Details</h3>
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Dimensions</th>
                    <th>Theoretical</th>
                    <th>Actual</th>
                    <th>Squish</th>
                    <th>Util (Theo)</th>
                    <th>Util (Actual)</th>
                    <th>Rotation</th>
                    <th>Weight</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAnalysis.results.map(result => (
                    <tr key={result.sku} className={result.squishFactor > 1.2 || result.squishFactor < 0.8 ? 'problematic' : ''}>
                      <td className="sku-name">{result.sku}</td>
                      <td>{result.dims.L}×{result.dims.W}×{result.dims.H}</td>
                      <td>{result.theoretical}</td>
                      <td><strong>{result.actual}</strong></td>
                      <td className={result.squishFactor > 1.2 ? 'high-squish' : result.squishFactor < 0.8 ? 'low-squish' : ''}>
                        {result.squishFactor.toFixed(2)}x
                      </td>
                      <td>{(result.theoreticalUtil * 100).toFixed(1)}%</td>
                      <td>{(result.actualUtil * 100).toFixed(1)}%</td>
                      <td>{result.rotation}</td>
                      <td>{result.weight.toFixed(1)} lb</td>
                      <td className="notes">{result.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {view === 'optimal' && optimalResults && (
          <div className="analysis-section">
            <div className="summary-card optimal">
              <h2>Optimal Masterpack: {optimalResults.optimal.dims.L}×{optimalResults.optimal.dims.W}×{optimalResults.optimal.dims.H} in</h2>
              <div className="summary-stats">
                <div className="stat-box">
                  <div className="stat-label">Avg Utilization</div>
                  <div className="stat-value">{(optimalResults.optimal.avgUtilization * 100).toFixed(1)}%</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Volume</div>
                  <div className="stat-value">{optimalResults.optimal.totalVolume.toFixed(0)} in³</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">vs Baseline</div>
                  <div className="stat-value">{(optimalResults.optimal.avgBaselineRatio * 100).toFixed(0)}%</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Pallet Coverage</div>
                  <div className="stat-value">{(optimalResults.optimal.palletFit.avgCoverage * 100).toFixed(1)}%</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Interlocking</div>
                  <div className="stat-value">{optimalResults.optimal.palletFit.canInterlock ? '✓ Yes' : '✗ No'}</div>
                </div>
              </div>
              
              {optimalResults.optimal.palletFit.canInterlock && (
                <div className="pallet-pattern">
                  <h3>Interlocking Pattern</h3>
                  <div className="pattern-details">
                    <div>Layer 1: {optimalResults.optimal.palletFit.layer1Count} cases ({(optimalResults.optimal.palletFit.layer1Coverage * 100).toFixed(1)}% coverage)</div>
                    <div>Layer 2: {optimalResults.optimal.palletFit.layer2Count} cases ({(optimalResults.optimal.palletFit.layer2Coverage * 100).toFixed(1)}% coverage)</div>
                    <div>Pattern: Alternating 90° rotation per layer for stability</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="sku-table">
              <h3>SKU Performance in Optimal Box</h3>
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Fits</th>
                    <th>Count</th>
                    <th>Utilization</th>
                    <th>vs Current</th>
                  </tr>
                </thead>
                <tbody>
                  {optimalResults.optimal.skuResults.map(result => (
                    <tr key={result.sku}>
                      <td className="sku-name">{result.sku}</td>
                      <td>{result.fits ? '✓' : '✗'}</td>
                      <td><strong>{result.count}</strong></td>
                      <td>{(result.utilization * 100).toFixed(1)}%</td>
                      <td className={result.count >= result.currentBaseline ? 'better' : 'worse'}>
                        {result.currentBaseline > 0 ? `${((result.count / result.currentBaseline) * 100).toFixed(0)}%` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="top-candidates">
              <h3>Other Top Candidates</h3>
              <div className="candidates-grid">
                {optimalResults.topCandidates.slice(1, 5).map((candidate, idx) => (
                  <div key={idx} className="candidate-card">
                    <h4>{candidate.dims.L}×{candidate.dims.W}×{candidate.dims.H} in</h4>
                    <div>Util: {(candidate.avgUtilization * 100).toFixed(1)}%</div>
                    <div>Vol: {candidate.totalVolume.toFixed(0)} in³</div>
                    <div>Coverage: {(candidate.palletFit.avgCoverage * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {!currentAnalysis && !optimizing && (
          <div className="empty-state">
            <p>Loading SKU data...</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App

import React, { useState, useMemo } from 'react';
import './KitAnalysisDashboard.css';
import { 
  getKitSummaryStats, 
  getKitsBySquishFactor, 
  getKitsByUtilization,
  findKitsNeedingBoxOptimization,
  analyzeSquishEfficiency,
  findBetterBoxSize
} from '../utils/kitAnalysis';

const KitAnalysisDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedKit, setSelectedKit] = useState(null);
  
  const summaryStats = useMemo(() => getKitSummaryStats(), []);
  const kitsBySquish = useMemo(() => getKitsBySquishFactor(), []);
  const kitsByUtilization = useMemo(() => getKitsByUtilization(), []);
  const needsOptimization = useMemo(() => findKitsNeedingBoxOptimization(0.75), []);
  
  const formatPercentage = (value) => `${(value * 100).toFixed(1)}%`;
  const formatVolume = (value) => value.toFixed(0);
  
  const renderOverview = () => (
    <div className="overview-section">
      <h2>Kit Measurement Overview</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Kits</h3>
          <div className="stat-value">{summaryStats.totalKits}</div>
        </div>
        <div className="stat-card">
          <h3>Avg Squish Factor</h3>
          <div className="stat-value">{summaryStats.averageSquishFactor.toFixed(3)}</div>
        </div>
        <div className="stat-card">
          <h3>Avg Box Utilization</h3>
          <div className="stat-value">{formatPercentage(summaryStats.averageBoxUtilization)}</div>
        </div>
        <div className="stat-card">
          <h3>Volume Reduction</h3>
          <div className="stat-value">{formatPercentage(summaryStats.averageVolumeReduction)}</div>
        </div>
      </div>
      
      <div className="chart-section">
        <h3>Box Size Distribution</h3>
        <div className="size-distribution">
          {Object.entries(summaryStats.boxSizeDistribution).map(([size, count]) => (
            <div key={size} className="size-item">
              <span className="size-label">{size}</span>
              <span className="size-count">{count} kits</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  
  const renderSquishAnalysis = () => (
    <div className="squish-analysis">
      <h2>Squish Factor Analysis</h2>
      <p>Kits with lower squish factors compress more (better for space efficiency)</p>
      
      <div className="kit-list">
        {kitsBySquish.slice(0, 10).map((kit, index) => (
          <div key={kit.sku} className="kit-item">
            <div className="kit-rank">#{index + 1}</div>
            <div className="kit-info">
              <div className="kit-sku">{kit.sku}</div>
              <div className="kit-dims">
                Box: {kit.box.dimensions.width}×{kit.box.dimensions.length}×{kit.box.dimensions.height}
              </div>
              <div className="kit-squish">
                Squish: {kit.calculations.squishFactor.toFixed(3)} 
                ({formatPercentage(kit.calculations.volumeReduction)} reduction)
              </div>
            </div>
            <div className="kit-actions">
              <button onClick={() => setSelectedKit(kit)}>Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  
  const renderUtilizationAnalysis = () => (
    <div className="utilization-analysis">
      <h2>Box Utilization Analysis</h2>
      <p>Kits with lower utilization might benefit from different box sizes</p>
      
      <div className="kit-list">
        {kitsByUtilization.slice(0, 10).map((kit, index) => (
          <div key={kit.sku} className="kit-item">
            <div className="kit-rank">#{index + 1}</div>
            <div className="kit-info">
              <div className="kit-sku">{kit.sku}</div>
              <div className="kit-utilization">
                Current: {formatPercentage(kit.calculations.utilizationBox)}
              </div>
              <div className="kit-quantity">
                Quantity: {kit.quantity} items
              </div>
            </div>
            <div className="kit-actions">
              <button onClick={() => setSelectedKit(kit)}>Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  
  const renderOptimizationOpportunities = () => (
    <div className="optimization-section">
      <h2>Box Optimization Opportunities</h2>
      <p>Kits that could benefit from different box sizes (utilization &lt; 75%)</p>
      
      {needsOptimization.length === 0 ? (
        <p>No kits need optimization at current threshold.</p>
      ) : (
        <div className="optimization-list">
          {needsOptimization.map(({ sku, currentUtilization, potentialImprovement }) => (
            <div key={sku} className="optimization-item">
              <div className="opt-sku">{sku}</div>
              <div className="opt-current">
                Current: {formatPercentage(currentUtilization)}
              </div>
              {potentialImprovement ? (
                <div className="opt-improvement">
                  <div>Best option: {potentialImprovement.dimensions.width}×{potentialImprovement.dimensions.length}×{potentialImprovement.dimensions.height}</div>
                  <div>Improvement: {formatPercentage(potentialImprovement.improvement)} ({formatPercentage(potentialImprovement.utilization)} total)</div>
                </div>
              ) : (
                <div className="opt-none">No better size found in range</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  const renderKitDetails = () => {
    if (!selectedKit) return null;
    
    const analysis = analyzeSquishEfficiency(selectedKit);
    const betterBox = findBetterBoxSize(selectedKit);
    
    return (
      <div className="kit-details-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Kit Details: {selectedKit.sku}</h2>
            <button onClick={() => setSelectedKit(null)}>Close</button>
          </div>
          
          <div className="details-grid">
            <div className="detail-section">
              <h3>Current Configuration</h3>
              <div className="detail-item">
                <label>Box Dimensions:</label>
                <span>{selectedKit.box.dimensions.width}×{selectedKit.box.dimensions.length}×{selectedKit.box.dimensions.height}</span>
              </div>
              <div className="detail-item">
                <label>Box Volume:</label>
                <span>{formatVolume(selectedKit.box.volume)} in³</span>
              </div>
              <div className="detail-item">
                <label>Quantity:</label>
                <span>{selectedKit.quantity} items</span>
              </div>
              <div className="detail-item">
                <label>Box Utilization:</label>
                <span>{formatPercentage(selectedKit.calculations.utilizationBox)}</span>
              </div>
            </div>
            
            <div className="detail-section">
              <h3>Item Measurements</h3>
              <div className="detail-item">
                <label>Original:</label>
                <span>{selectedKit.original.dimensions.width}×{selectedKit.original.dimensions.length}×{selectedKit.original.dimensions.height}</span>
              </div>
              <div className="detail-item">
                <label>Squished:</label>
                <span>{selectedKit.squished.dimensions.width}×{selectedKit.squished.dimensions.length}×{selectedKit.squished.dimensions.height}</span>
              </div>
              <div className="detail-item">
                <label>Squish Factor:</label>
                <span>{selectedKit.calculations.squishFactor.toFixed(3)}</span>
              </div>
              <div className="detail-item">
                <label>Volume Reduction:</label>
                <span>{formatPercentage(selectedKit.calculations.volumeReduction)}</span>
              </div>
            </div>
            
            <div className="detail-section">
              <h3>Efficiency Analysis</h3>
              <div className="detail-item">
                <label>Current Squished Util:</label>
                <span>{formatPercentage(analysis.currentSquishedUtil)}</span>
              </div>
              <div className="detail-item">
                <label>Theoretical Original Util:</label>
                <span>{formatPercentage(analysis.theoreticalOriginalUtil)}</span>
              </div>
              <div className="detail-item">
                <label>Squish Benefit:</label>
                <span>{formatPercentage(analysis.squishBenefit)}</span>
              </div>
              <div className="detail-item">
                <label>Total Volume Savings:</label>
                <span>{formatVolume(analysis.volumeSavings)} in³</span>
              </div>
            </div>
            
            {betterBox && (
              <div className="detail-section">
                <h3>Potential Improvement</h3>
                <div className="detail-item">
                  <label>Better Box Size:</label>
                  <span>{betterBox.dimensions.width}×{betterBox.dimensions.length}×{betterBox.dimensions.height}</span>
                </div>
                <div className="detail-item">
                  <label>New Utilization:</label>
                  <span>{formatPercentage(betterBox.utilization)}</span>
                </div>
                <div className="detail-item">
                  <label>Improvement:</label>
                  <span>{formatPercentage(betterBox.improvement)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="kit-analysis-dashboard">
      <header>
        <h1>Kit Measurement Analysis Dashboard</h1>
        <div className="tab-navigation">
          <button 
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={activeTab === 'squish' ? 'active' : ''}
            onClick={() => setActiveTab('squish')}
          >
            Squish Analysis
          </button>
          <button 
            className={activeTab === 'utilization' ? 'active' : ''}
            onClick={() => setActiveTab('utilization')}
          >
            Utilization
          </button>
          <button 
            className={activeTab === 'optimization' ? 'active' : ''}
            onClick={() => setActiveTab('optimization')}
          >
            Optimization
          </button>
        </div>
      </header>
      
      <main>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'squish' && renderSquishAnalysis()}
        {activeTab === 'utilization' && renderUtilizationAnalysis()}
        {activeTab === 'optimization' && renderOptimizationOpportunities()}
      </main>
      
      {renderKitDetails()}
    </div>
  );
};

export default KitAnalysisDashboard;

import { useState, useMemo } from 'react'

const SkuSearch = ({ skus, onSkuSelect, recentSkus = [] }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Filter SKUs based on search term
  const filteredSkus = useMemo(() => {
    if (!searchTerm) return []
    return skus.filter(sku => 
      sku.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.notes.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10) // Limit to 10 results
  }, [searchTerm, skus])

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setIsOpen(e.target.value.length > 0)
  }

  const handleSkuSelect = (sku) => {
    setSearchTerm('')
    setIsOpen(false)
    onSkuSelect(sku)
  }

  return (
    <div className="sku-search">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search SKUs..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
        />
        {isOpen && filteredSkus.length > 0 && (
          <div className="search-results">
            {filteredSkus.map(sku => (
              <div 
                key={sku.sku} 
                className="search-result-item"
                onClick={() => handleSkuSelect(sku)}
              >
                {sku.sku} - {sku.notes}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {recentSkus.length > 0 && (
        <div className="recent-skus">
          <h3>Recently Viewed</h3>
          <div className="recent-skus-list">
            {recentSkus.map(sku => (
              <button 
                key={sku.sku} 
                className="recent-sku-button"
                onClick={() => handleSkuSelect(sku)}
              >
                {sku.sku}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SkuSearch

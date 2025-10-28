import { skusToCSV } from '../utils/csvParser'

const ExportButton = ({ skus, fileName = 'skus-export' }) => {
  const exportToCSV = () => {
    const csvContent = skusToCSV(skus)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${fileName}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToJSON = () => {
    const jsonContent = JSON.stringify(skus, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${fileName}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="export-buttons">
      <button onClick={exportToCSV}>Export to CSV</button>
      <button onClick={exportToJSON}>Export to JSON</button>
    </div>
  )
}

export default ExportButton

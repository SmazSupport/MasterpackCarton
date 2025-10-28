# Box Product Configuration Tool

This tool helps optimize masterpack box sizes for shipping products on pallets. It calculates the best arrangement of individual product units (SKUs) within a masterpack box and shows how these boxes can be stacked on a standard 40" x 48" pallet.

## Features

- SKU search through large product databases
- Masterpack optimization for target pallet heights
- 3D visualization of product arrangements
- Unit conversion between imperial and metric systems
- Support for both JSON and CSV data formats
- No server required - runs entirely in the browser

## Getting Started

1. Upload your product data using either:
   - JSON file with complete data structure
   - CSV file with product information

2. Search for a specific SKU to analyze

3. View the optimal arrangement of that SKU in the masterpack box

4. See how the masterpack boxes stack on a pallet

## Data Format

### JSON Format
The JSON file should contain:
- `global`: Pallet dimensions, target height, and other settings
- `masterpackCandidate`: Current masterpack box dimensions and weight
- `skus`: Array of product SKUs with dimensions and weights

### CSV Format
The CSV file should have columns:
- `sku`: Product identifier
- `unit_L`, `unit_W`, `unit_H`: Product dimensions
- `unit_units`: Units for dimensions (in, mm, cm)
- `unit_weight_value`: Product weight
- `unit_weight_units`: Units for weight (oz, lb, g, kg)
- `notes`: Additional product information

## Development

To run the development server:

```bash
npm run dev
```

To build for production:

```bash
npm run build
```

## Deployment

This application can be deployed to GitHub Pages since it requires no backend server.

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to GitHub Pages:
   ```bash
   npm run deploy
   ```

### Automatic Deployment

This repository includes a GitHub Actions workflow that automatically deploys to GitHub Pages when changes are pushed to the `main` branch.

To enable automatic deployment:
1. Go to your repository settings
2. Navigate to "Pages" in the sidebar
3. Under "Source", select "GitHub Actions"

The application will now automatically deploy whenever changes are pushed to the main branch.

# FSAPT Energy Visualization

An interactive web application for visualizing Fragmentation-based Symmetry-Adapted Perturbation Theory (FSAPT) energy breakdowns using AP-Net2 pairwise predictions from QCMLForge.

## Overview

This application provides a 3D molecular visualization interface where users can:
- Input molecular dimer structures in qcelemental format
- Compute interaction energies using AP-Net2 machine learning models
- Visualize energy components (total, electrostatic, exchange, induction, dispersion)
- Select atoms to analyze partial interaction energies
- View energy heatmaps on molecular structures

## Architecture

- **Frontend**: React + TypeScript with JSMol for 3D visualization
- **Backend**: Python Flask API with QCMLForge/AP-Net2 integration
- **ML Model**: AP-Net2 fused model for pairwise energy predictions

## Prerequisites

### Python Environment
- Python 3.8+
- QCMLForge with AP-Net2 support
- Flask and flask-cors

### Node.js Environment
- Node.js 16+
- npm or yarn

## Installation

### 1. Clone and Setup Python Environment

```bash
# Ensure you're in the qcml conda environment
conda activate qcml

# Install required Python packages
pip install flask flask-cors
```

### 2. Install Node.js Dependencies

```bash
# Install React application dependencies
npm install
```

## Running the Application

### 1. Start the Flask Backend

```bash
# From the project root directory
python app.py
```

The Flask API will start on `http://localhost:5000`

### 2. Start the React Frontend

```bash
# In a separate terminal
npm run dev
```

The React application will start on `http://localhost:3002` (or next available port)

### 3. Access the Application

Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:3002`)

## Usage

### Inputting Molecules

1. **Manual Input**: Paste a qcelemental molecule string into the text area
2. **Example Loading**: Click "Load Example" to load a sample water dimer

**Molecule Format**:
```
0 1
8   -0.702196054   -0.056060256   0.009942262
1   -1.022193224   0.846775782   -0.011488714
1   0.257521062   0.042121496   0.005218999
--
0 1
8   2.268880784   0.026340101   0.000508029
1   2.645502399   -0.412039965   0.766632411
1   2.641145101   -0.449872874   -0.744894473
```

### Computing Energies

1. Enter or load a molecule string
2. Click "Compute Energies"
3. Wait for AP-Net2 to process the dimer
4. View energy breakdowns in the legend panel

### Energy Components

The application computes five energy components:
- **Total**: Overall interaction energy
- **Electrostatic**: Coulombic interactions
- **Exchange**: Pauli repulsion/quantum effects
- **Induction**: Polarization effects
- **Dispersion**: van der Waals attractions

### Selecting Energy Components

Use the component selector to choose which energy type to visualize:
- Total interaction energy
- Individual physical components
- Future: Atom-level heatmaps

### Atom Selection (Planned)

Future functionality will allow:
- Clicking atoms in the 3D viewer to select them
- Viewing partial interaction energies for selected atom groups
- Heatmap visualization of energy contributions

## API Documentation

### POST /predict-pairwise-energies

Computes pairwise interaction energies for a molecular dimer.

**Request Body**:
```json
{
  "molecule_string": "qcelemental molecule format string"
}
```

**Response**:
```json
{
  "energies": {
    "total": [[float]], // Na×Nb matrix
    "elst": [[float]],  // Na×Nb matrix
    "exch": [[float]],  // Na×Nb matrix
    "ind": [[float]],   // Na×Nb matrix
    "disp": [[float]]   // Na×Nb matrix
  },
  "atom_counts": {
    "molecule_a": int,
    "molecule_b": int
  },
  "total_energies": {
    "total": float,
    "elst": float,
    "exch": float,
    "ind": float,
    "disp": float
  }
}
```

### GET /health

Health check endpoint.

**Response**:
```json
{
  "status": "healthy"
}
```

## Current Status

### ✅ Implemented Features
- Flask API with AP-Net2 integration
- React frontend with component architecture
- Molecule input and parsing
- Energy computation and display
- Component selection interface
- Energy legend with breakdowns
- JSMol 3D viewer with dynamic sizing (smaller, centered)
- Loading states and error handling
- Responsive UI with proper centering

### 🚧 In Development
- Atom selection in 3D viewer
- Energy heatmap visualization
- Partial energy calculations for selected atoms
- Advanced molecule format support

### 📝 Known Limitations
- Energy matrices currently return placeholder data (only totals computed)
- Atom selection not yet functional
- Heatmap coloring not implemented
- JSMol may require additional browser permissions for 3D rendering

## Development

### Project Structure

```
├── app.py                 # Flask backend
├── src/
│   ├── components/        # React components
│   │   ├── JSMolViewer.tsx
│   │   ├── EnergyLegend.tsx
│   │   ├── ComponentSelector.tsx
│   │   ├── AtomSelectionPanel.tsx
│   │   └── MoleculeInput.tsx
│   ├── types/
│   │   └── energy.ts      # TypeScript interfaces
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
└── README.md
```

### Adding New Features

1. **Backend**: Modify `app.py` for new API endpoints
2. **Frontend**: Add components in `src/components/`
3. **Types**: Update interfaces in `src/types/energy.ts`

## Troubleshooting

### Common Issues

**Flask server won't start**
- Ensure you're in the correct conda environment (`conda activate qcml`)
- Check that flask-cors is installed: `pip install flask-cors`

**React app won't start**
- Ensure Node.js is installed: `node --version`
- Clear node_modules: `rm -rf node_modules && npm install`

**JSMol not loading**
- Check browser console for JavaScript errors
- Ensure internet connection for CDN resources

**API connection failed**
- Verify Flask server is running on port 5000
- Check CORS settings in browser developer tools

### Debug Mode

Both servers run in debug mode by default:
- Flask: `python app.py` (shows detailed error messages)
- React: `npm run dev` (hot reloading enabled)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper TypeScript types
4. Test both frontend and backend
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- QCMLForge and AP-Net2 for machine learning models
- JSMol for 3D molecular visualization
- React and Flask communities
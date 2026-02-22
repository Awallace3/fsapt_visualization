# FSAPT Visualization with 3Dmol.js

A React-based interactive visualization tool for Fragment-based Symmetry-Adapted Perturbation Theory (F-SAPT) energy analysis using 3Dmol.js for molecular rendering and AP-Net2 for pairwise energy predictions.

## Features

- **3D Molecular Visualization**: Interactive 3Dmol.js viewer for molecular dimers
- **Pairwise Energy Analysis**: Compute interaction energies using AP-Net2 from QCMLForge
- **Energy Component Breakdown**: View total, electrostatic, exchange, induction, and dispersion components
- **Interactive Heatmap Coloring**: Atoms colored by energy contributions (blue = attractive, red = repulsive)
- **Atom Selection**: Click atoms to select groups and view partial interaction energies
- **Component Selection**: Switch between different energy components for visualization
- **Real-time Calculations**: Flask backend with CORS support for seamless API communication

## Data Flow

1. User inputs qcelemental molecule string for a dimer system
2. Frontend renders the dimer structure in 3Dmol.js viewer
3. Backend computes Na×Nb pairwise energy matrix using AP-Net2
4. Frontend displays energy legend with all component breakdowns
5. User selects energy component (total, elst, exch, ind, disp) for heatmap visualization
6. User clicks atoms to select groups and view partial interaction energies between selected groups

## Project Structure

```
fsapt-vis/
├── src/
│   ├── components/
│   │   ├── MoleculeInput.tsx      # QCElemental string input component
│   │   ├── MolViewer.tsx          # 3Dmol.js viewer with heatmap and selection
│   │   ├── EnergyLegend.tsx       # Total energy components display
│   │   ├── ComponentSelector.tsx   # Radio buttons for energy component selection
│   │   └── VisualizationContainer.tsx  # Main container managing state
│   ├── types/
│   │   └── 3dmol.d.ts             # TypeScript definitions for 3Dmol
│   ├── App.tsx                     # Root application component
│   └── main.tsx                    # React entry point
├── app.py                          # Flask backend with AP-Net2 integration
├── package.json
└── vite.config.ts
```

## Prerequisites

### Frontend
- Node.js (v16 or higher)
- npm or yarn

### Backend
- Python 3.8+
- Flask
- flask-cors
- qcelemental
- apnet-pt (QCMLForge AP-Net2)
- numpy

## Installation

### Frontend Setup

```bash
cd fsapt-vis
npm install
```

### Backend Setup

```bash
# Install Python dependencies
pip install flask flask-cors qcelemental numpy apnet-pt

# Or with conda
conda install -c conda-forge flask flask-cors qcelemental numpy
pip install apnet-pt
```

## Running the Application

### Start Backend Server

```bash
# From the fsapt-vis directory
python app.py
```

The Flask server will start on `http://localhost:5000`

### Start Frontend Development Server

```bash
# In a separate terminal, from the fsapt-vis directory
npm run dev
```

The Vite dev server will start on `http://localhost:5173` (or another port if 5173 is busy)

## Usage

1. **Input Molecule**: Enter a qcelemental molecule string in the text area. The format should be:
   ```
   0 1
   O  -1.551007  -0.114520   0.000000
   H  -1.934259   0.762503   0.000000
   H  -0.599677   0.040712   0.000000
   --
   0 1
   O   1.350625   0.111469   0.000000
   H   1.680398  -0.373741  -0.758561
   H   1.680398  -0.373741   0.758561
   ```
   The `--` separator divides the two fragments (molecules A and B).

2. **Calculate Energies**: Click "Calculate Energies" to send the molecule to the backend for AP-Net2 prediction.

3. **View Results**: 
   - The 3D viewer will display the molecular structure
   - The Energy Legend shows total interaction energies for all components
   - Atoms are initially colored by element

4. **Select Component**: Choose an energy component (Total, Electrostatics, Exchange, Induction, or Dispersion) to visualize the heatmap. Atoms will be colored based on their contribution to that component.

5. **Select Atoms**: Click atoms in the viewer to select them (they turn yellow). Select atoms from both molecules to see the partial interaction energy between the selected groups.

## API Endpoints

### POST /predict-pairwise-energies

Request body:
```json
{
  "molecule_string": "0 1\nO 0 0 0\nH 1 0 0\nH 0 1 0\n--\n0 1\nO 3 0 0\nH 4 0 0\nH 3 1 0"
}
```

Response:
```json
{
  "energies": {
    "total": [[float]],
    "elst": [[float]],
    "exch": [[float]],
    "ind": [[float]],
    "disp": [[float]]
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

Health check endpoint that returns:
```json
{
  "status": "healthy"
}
```

## Building for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Visualization**: 3Dmol.js v2.5.3
- **Backend**: Flask with CORS
- **ML Model**: AP-Net2 (QCMLForge apnet-pt)
- **Molecular Format**: QCElemental

## Color Scheme

- **Blue**: Attractive (negative) interactions
- **White**: Neutral (near-zero) interactions
- **Red**: Repulsive (positive) interactions
- **Yellow**: Selected atoms

## Energy Components

- **Total**: Sum of all energy components
- **Electrostatics (elst)**: Coulombic interactions
- **Exchange (exch)**: Pauli repulsion
- **Induction (ind)**: Polarization effects
- **Dispersion (disp)**: London dispersion forces

## Notes

- The current backend implementation distributes total energy across atom pairs based on distance (1/r²) weighting
- Component-specific pairwise decomposition can be enhanced with more detailed AP-Net2 analysis
- Energy values are in kcal/mol

## Future Enhancements

- Matrix heatmap visualization for full Na×Nb energy display
- Export capabilities for energy data
- Support for more complex molecular systems
- Integration with additional quantum chemistry packages
- Per-residue or per-fragment energy summaries

## License

See LICENSE file in repository root.


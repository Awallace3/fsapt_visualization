# FSAPT Visualization with AP-Net2 and JSMol - Implementation Plan

## Overview
Create a React app with JSMol visualization and Flask backend for AP-Net2 pairwise energy predictions from QCMLForge.

## Data Flow
1. User inputs qcelemental molecule string in frontend
2. Frontend renders dimer in JSMol viewer
3. Backend computes full Na×Nb pairwise energy matrix using AP-Net2
4. Frontend displays energy legend with component breakdowns
5. User selects energy component for heatmap visualization
6. User clicks atoms to select groups and view partial interaction energies

## Backend Implementation

### API Design
- **Endpoint**: `POST /predict-pairwise-energies`
- **Input**: JSON with `molecule_string` field
- **Output**: JSON with energy matrices and totals

### Response Structure
```json
{
  "energies": {
    "total": [[float]],    // Na×Nb matrix
    "elst": [[float]],     // Na×Nb matrix
    "exch": [[float]],     // Na×Nb matrix
    "ind": [[float]],      // Na×Nb matrix
    "disp": [[float]]      // Na×Nb matrix
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

## Frontend Implementation

### Component Structure
```
src/
├── components/
│   ├── JSMolViewer.tsx           # 3D viewer with atom selection
│   ├── EnergyHeatmap.tsx         # Heatmap coloring logic
│   ├── EnergyLegend.tsx          # Side panel with energy breakdowns
│   ├── ComponentSelector.tsx     # Dropdown for energy component selection
│   ├── AtomSelectionPanel.tsx    # Selected atoms and summed energies
│   └── MoleculeInput.tsx         # Text area for molecule string input
├── hooks/
│   └── useEnergyData.ts          # API calls and data management
├── types/
│   └── energy.ts                 # TypeScript interfaces for energy data
└── utils/
    └── colorScale.ts             # Color mapping for energy values
```

## Implementation Progress

### Backend Tasks
- [x] Design Flask API endpoint
- [x] Implement Flask backend with energy computation
- [x] Test API with sample molecule data

### Frontend Tasks
- [x] Create React app structure
- [x] Set up JSMol integration with dynamic sizing
- [x] Implement molecule input handling
- [x] Create energy API client
- [x] Implement energy legend component
- [x] Add component selector
- [ ] Implement atom selection functionality
- [ ] Create heatmap visualization
- [x] Add partial energy display
- [x] Implement error handling and loading states
- [x] Fix JSMol black screen issue with smaller, centered viewer

### Documentation Tasks
- [x] Create comprehensive README.md with setup and usage instructions

## Technical Notes
- AP-Net2 returns 5-component energy arrays: [total, elst, exch, ind, disp]
- Need to decompose into pairwise atom interactions
- JSMol integration requires careful handling of atom selection callbacks
- Color scale: blue (attractive) → white → red (repulsive)
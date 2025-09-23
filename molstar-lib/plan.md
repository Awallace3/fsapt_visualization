# FSAPT Visualization with AP-Net2 and molestar - Implementation Plan

## Overview
Create a React app with molestar visualization and Flask backend for AP-Net2 pairwise energy predictions from QCMLForge.

## Data Flow
1. User inputs qcelemental molecule string in frontend
2. Frontend renders dimer in molestar viewer
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
TODO

## Implementation Progress

### Backend Tasks
- [x] Design Flask API endpoint
- [x] Implement Flask backend with energy computation
- [ ] Test API with sample molecule data

### Frontend Tasks
- [x] Create React app structure
- [ ] Set up molestar integration with dynamic sizing
- [ ] Implement molecule input handling
- [ ] Create energy API client
- [ ] Implement energy legend component
- [ ] Add component selector
- [ ] Implement atom selection functionality
- [ ] Create heatmap visualization
- [ ] Add partial energy display
- [ ] Implement error handling and loading states

### Documentation Tasks
- [x] Create comprehensive README.md with setup and usage instructions

## Technical Notes
- AP-Net2 returns 5-component energy arrays: [total, elst, exch, ind, disp]
- Need to decompose into pairwise atom interactions
- molestar integration requires careful handling of atom selection callbacks
- Color scale: blue (attractive) → white → red (repulsive)

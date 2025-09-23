# Project Goal: QCMLForge APNet2 Energy Visualization

## Overview
Create a React-based web application that visualizes molecular interaction energies calculated using QCMLForge's APNet2 method. The application should provide an interactive 3D molecular viewer with energy-based coloring schemes to help researchers understand pairwise energy contributions in molecular complexes.

## Key Features
- **3D Molecular Visualization**: Interactive Mol* (Molstar) viewer for displaying molecular structures
- **Energy Coloring**: Color atoms based on APNet2-calculated energy contributions (attractive vs repulsive interactions)
- **API Integration**: Backend service to compute and serve energy data for ligand-protein pairs
- **Interactive Controls**: UI for loading structures, selecting analysis parameters, and applying visualizations
- **Real-time Analysis**: Fetch energy data and apply coloring dynamically

## Technical Stack
- **Frontend**: React + TypeScript + Molstar for 3D visualization
- **Backend**: Python Flask API for energy calculations
- **Data**: QCMLForge APNet2 energy decomposition data
- **Build**: esbuild for fast compilation and bundling

## Success Criteria
- Users can load molecular structures (PDB, mmCIF, BCIF formats)
- Energy data is fetched from QCMLForge APNet2 calculations
- Atoms are colored based on energy contributions (blue for attractive, red for repulsive)
- Interactive legend and controls for threshold adjustment
- Responsive UI with proper error handling and loading states
import { useState } from 'react';
import MoleculeInput from './components/MoleculeInput';
import JSMolViewer from './components/JSMolViewer';
import EnergyLegend from './components/EnergyLegend';
import ComponentSelector from './components/ComponentSelector';
import AtomSelectionPanel from './components/AtomSelectionPanel';
import { EnergyData, EnergyComponent, AtomSelection } from './types/energy';
import './App.css';

function App() {
  const [moleculeString, setMoleculeString] = useState<string>('');
  const [energyData, setEnergyData] = useState<EnergyData | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<EnergyComponent>('total');
  const [atomSelection, setAtomSelection] = useState<AtomSelection>({ moleculeA: [], moleculeB: [] });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleMoleculeSubmit = async (molString: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/predict-pairwise-energies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ molecule_string: molString }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: EnergyData = await response.json();
      setEnergyData(data);
      setMoleculeString(molString);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleAtomSelect = (moleculeType: 'A' | 'B', atomIndex: number) => {
    setAtomSelection(prev => {
      const key = moleculeType === 'A' ? 'moleculeA' : 'moleculeB';
      const currentSelection = prev[key];
      const isSelected = currentSelection.includes(atomIndex);

      return {
        ...prev,
        [key]: isSelected
          ? currentSelection.filter(i => i !== atomIndex)
          : [...currentSelection, atomIndex]
      };
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>FSAPT Energy Visualization</h1>
        <p>Interactive 3D visualization of AP-Net2 pairwise interaction energies</p>
      </header>

      <div className="app-content">
        <div className="left-panel">
          <MoleculeInput
            onSubmit={handleMoleculeSubmit}
            loading={loading}
            error={error}
          />

          {energyData && (
            <>
              <ComponentSelector
                selectedComponent={selectedComponent}
                onComponentChange={setSelectedComponent}
              />

              <EnergyLegend energyData={energyData} />

              <AtomSelectionPanel
                atomSelection={atomSelection}
                energyData={energyData}
                selectedComponent={selectedComponent}
              />
            </>
          )}
        </div>
        <div className="main-viewer">
          <JSMolViewer
            moleculeString={moleculeString}
            energyData={energyData}
            selectedComponent={selectedComponent}
            atomSelection={atomSelection}
            onAtomSelect={handleAtomSelect}
          />
        </div>
      </div>
    </div>
  );
}

export default App;

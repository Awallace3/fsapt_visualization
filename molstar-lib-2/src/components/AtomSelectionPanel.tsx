import { useMemo } from 'react';
import { EnergyData, EnergyComponent, AtomSelection } from '../types/energy';

interface AtomSelectionPanelProps {
  atomSelection: AtomSelection;
  energyData: EnergyData;
  selectedComponent: EnergyComponent;
}

const AtomSelectionPanel: React.FC<AtomSelectionPanelProps> = ({
  atomSelection,
  energyData,
  selectedComponent
}) => {
  const partialEnergySum = useMemo(() => {
    if (atomSelection.moleculeA.length === 0 && atomSelection.moleculeB.length === 0) {
      return null;
    }

    let sum = 0;
    let count = 0;

    // Sum energies for selected atom pairs
    atomSelection.moleculeA.forEach(atomA => {
      atomSelection.moleculeB.forEach(atomB => {
        if (atomA < energyData.energies[selectedComponent].length &&
            atomB < energyData.energies[selectedComponent][atomA].length) {
          sum += energyData.energies[selectedComponent][atomA][atomB];
          count++;
        }
      });
    });

    return { value: sum, count };
  }, [atomSelection, energyData, selectedComponent]);

  const formatEnergy = (value: number): string => {
    return value.toFixed(4);
  };

  const getEnergyClass = (value: number): string => {
    if (value < -0.1) return 'energy-value negative';
    if (value > 0.1) return 'energy-value positive';
    return 'energy-value';
  };

  return (
    <div className="panel-section">
      <h3>Atom Selection</h3>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#bbb' }}>
          Selected atoms in Molecule A: {atomSelection.moleculeA.length > 0
            ? atomSelection.moleculeA.map(i => i + 1).join(', ')
            : 'None'}
        </div>
        <div style={{ fontSize: '0.9rem', color: '#bbb' }}>
          Selected atoms in Molecule B: {atomSelection.moleculeB.length > 0
            ? atomSelection.moleculeB.map(i => i + 1).join(', ')
            : 'None'}
        </div>
      </div>

      {partialEnergySum && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#1a1a1a',
          borderRadius: '4px',
          border: '1px solid #555'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#64b5f6' }}>
            Partial Energy Sum
          </h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#ddd' }}>
              {selectedComponent.toUpperCase()} energy for {partialEnergySum.count} atom pair{partialEnergySum.count !== 1 ? 's' : ''}:
            </span>
            <span className={getEnergyClass(partialEnergySum.value)}>
              {formatEnergy(partialEnergySum.value)}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
            Sum of {selectedComponent} interactions between selected atoms
          </div>
        </div>
      )}

      {(atomSelection.moleculeA.length === 0 && atomSelection.moleculeB.length === 0) && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#1a1a1a',
          borderRadius: '4px',
          border: '1px solid #555',
          textAlign: 'center',
          color: '#888',
          fontSize: '0.9rem'
        }}>
          Click on atoms in the 3D viewer to select them and see partial interaction energies
        </div>
      )}
    </div>
  );
};

export default AtomSelectionPanel;
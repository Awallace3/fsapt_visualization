import { EnergyData } from '../types/energy';

interface EnergyLegendProps {
  energyData: EnergyData;
}

const EnergyLegend: React.FC<EnergyLegendProps> = ({ energyData }) => {
  const formatEnergy = (value: number): string => {
    return value.toFixed(4);
  };

  const getEnergyClass = (value: number): string => {
    if (value < -0.1) return 'energy-value negative';
    if (value > 0.1) return 'energy-value positive';
    return 'energy-value';
  };

  const components = [
    { key: 'total' as const, label: 'Total Energy', color: '#64b5f6' },
    { key: 'elst' as const, label: 'Electrostatic', color: '#f44336' },
    { key: 'exch' as const, label: 'Exchange', color: '#ff9800' },
    { key: 'ind' as const, label: 'Induction', color: '#9c27b0' },
    { key: 'disp' as const, label: 'Dispersion', color: '#4caf50' }
  ];

  return (
    <div className="panel-section">
      <h3>Interaction Energies</h3>
      <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#bbb' }}>
        Total interaction energies for the dimer (kcal/mol)
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {components.map(({ key, label, color }) => (
          <div
            key={key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem',
              backgroundColor: '#1a1a1a',
              borderRadius: '4px',
              borderLeft: `4px solid ${color}`
            }}
          >
            <span style={{ color: '#ddd', fontSize: '0.9rem' }}>{label}</span>
            <span className={getEnergyClass(energyData.total_energies[key])}>
              {formatEnergy(energyData.total_energies[key])}
            </span>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        backgroundColor: '#1a1a1a',
        borderRadius: '4px',
        fontSize: '0.85rem',
        color: '#bbb'
      }}>
        <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#64b5f6' }}>
          Color Scale Legend
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <div style={{
            width: '20px',
            height: '12px',
            background: 'linear-gradient(to right, #f44336, #ffffff, #2196f3)',
            borderRadius: '2px'
          }}></div>
          <span>Attractive ← Neutral → Repulsive</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#888' }}>
          Atom colors represent interaction strength for selected component
        </div>
      </div>
    </div>
  );
};

export default EnergyLegend;
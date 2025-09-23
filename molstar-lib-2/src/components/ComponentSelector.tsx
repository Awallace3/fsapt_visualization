import { EnergyComponent } from '../types/energy';

interface ComponentSelectorProps {
  selectedComponent: EnergyComponent;
  onComponentChange: (component: EnergyComponent) => void;
}

const ComponentSelector: React.FC<ComponentSelectorProps> = ({
  selectedComponent,
  onComponentChange
}) => {
  const components: { value: EnergyComponent; label: string; description: string }[] = [
    { value: 'total', label: 'Total', description: 'Total interaction energy' },
    { value: 'elst', label: 'Electrostatic', description: 'Electrostatic interactions' },
    { value: 'exch', label: 'Exchange', description: 'Exchange repulsion' },
    { value: 'ind', label: 'Induction', description: 'Induction/polarization' },
    { value: 'disp', label: 'Dispersion', description: 'Dispersion attraction' }
  ];

  return (
    <div className="panel-section">
      <h3>Energy Component</h3>
      <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#bbb' }}>
        Select which energy component to visualize on the 3D structure
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {components.map(({ value, label, description }) => (
          <label
            key={value}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.5rem',
              border: `2px solid ${selectedComponent === value ? '#64b5f6' : '#555'}`,
              borderRadius: '4px',
              backgroundColor: selectedComponent === value ? '#333' : '#2a2a2a',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <input
              type="radio"
              name="energy-component"
              value={value}
              checked={selectedComponent === value}
              onChange={() => onComponentChange(value)}
              style={{ marginRight: '0.5rem' }}
            />
            <div>
              <div style={{ fontWeight: 'bold', color: '#64b5f6' }}>{label}</div>
              <div style={{ fontSize: '0.8rem', color: '#bbb' }}>{description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export default ComponentSelector;
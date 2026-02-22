import React from 'react';

interface ComponentSelectorProps {
    selectedComponent: 'total' | 'elst' | 'exch' | 'ind' | 'disp';
    onComponentChange: (component: 'total' | 'elst' | 'exch' | 'ind' | 'disp') => void;
    disabled?: boolean;
}

const ComponentSelector: React.FC<ComponentSelectorProps> = ({ 
    selectedComponent, 
    onComponentChange,
    disabled = false 
}) => {
    const components = [
        { value: 'total', label: 'Total', color: '#333' },
        { value: 'elst', label: 'Electrostatics', color: '#2196F3' },
        { value: 'exch', label: 'Exchange', color: '#F44336' },
        { value: 'ind', label: 'Induction', color: '#4CAF50' },
        { value: 'disp', label: 'Dispersion', color: '#FF9800' }
    ] as const;

    return (
        <div style={{ 
            border: '1px solid #ccc', 
            padding: '15px', 
            borderRadius: '5px',
            backgroundColor: '#f9f9f9'
        }}>
            <h3 style={{ marginTop: 0 }}>Visualization Component</h3>
            <p style={{ fontSize: '12px', color: '#666', marginTop: 0 }}>
                Select energy component for heatmap coloring
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {components.map(comp => (
                    <label 
                        key={comp.value}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            padding: '10px',
                            backgroundColor: selectedComponent === comp.value ? '#e3f2fd' : 'white',
                            border: selectedComponent === comp.value ? '2px solid #2196F3' : '1px solid #e0e0e0',
                            borderRadius: '3px',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.5 : 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        <input
                            type="radio"
                            name="energy-component"
                            value={comp.value}
                            checked={selectedComponent === comp.value}
                            onChange={() => onComponentChange(comp.value)}
                            disabled={disabled}
                            style={{ marginRight: '10px' }}
                        />
                        <div 
                            style={{ 
                                width: '12px', 
                                height: '12px', 
                                backgroundColor: comp.color,
                                borderRadius: '2px',
                                marginRight: '10px'
                            }} 
                        />
                        <span style={{ fontWeight: selectedComponent === comp.value ? 'bold' : 'normal' }}>
                            {comp.label}
                        </span>
                    </label>
                ))}
            </div>
        </div>
    );
};

export default ComponentSelector;

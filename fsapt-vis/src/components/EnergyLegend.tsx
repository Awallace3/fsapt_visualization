import React from 'react';

interface EnergyLegendProps {
    totalEnergies: {
        total: number;
        elst: number;
        exch: number;
        ind: number;
        disp: number;
    } | null;
}

const EnergyLegend: React.FC<EnergyLegendProps> = ({ totalEnergies }) => {
    if (!totalEnergies) {
        return (
            <div style={{ 
                border: '1px solid #ccc', 
                padding: '15px', 
                borderRadius: '5px',
                backgroundColor: '#f9f9f9'
            }}>
                <h3 style={{ marginTop: 0 }}>Energy Components</h3>
                <p style={{ color: '#666' }}>Calculate energies to see breakdown</p>
            </div>
        );
    }

    const components = [
        { key: 'total', label: 'Total', value: totalEnergies.total, color: '#333' },
        { key: 'elst', label: 'Electrostatics', value: totalEnergies.elst, color: '#2196F3' },
        { key: 'exch', label: 'Exchange', value: totalEnergies.exch, color: '#F44336' },
        { key: 'ind', label: 'Induction', value: totalEnergies.ind, color: '#4CAF50' },
        { key: 'disp', label: 'Dispersion', value: totalEnergies.disp, color: '#FF9800' }
    ];

    return (
        <div style={{ 
            border: '1px solid #ccc', 
            padding: '15px', 
            borderRadius: '5px',
            backgroundColor: '#f9f9f9'
        }}>
            <h3 style={{ marginTop: 0 }}>Energy Components (kcal/mol)</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {components.map(comp => (
                    <div 
                        key={comp.key}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            padding: '8px',
                            backgroundColor: 'white',
                            borderRadius: '3px',
                            border: '1px solid #e0e0e0'
                        }}
                    >
                        <div 
                            style={{ 
                                width: '12px', 
                                height: '12px', 
                                backgroundColor: comp.color,
                                borderRadius: '2px',
                                marginRight: '10px'
                            }} 
                        />
                        <div style={{ flex: 1 }}>
                            <strong>{comp.label}:</strong>
                        </div>
                        <div style={{ 
                            fontFamily: 'monospace',
                            fontWeight: comp.key === 'total' ? 'bold' : 'normal'
                        }}>
                            {comp.value.toFixed(4)}
                        </div>
                    </div>
                ))}
            </div>
            
            <div style={{ 
                marginTop: '15px', 
                padding: '10px',
                backgroundColor: '#e3f2fd',
                borderRadius: '3px',
                fontSize: '12px'
            }}>
                <strong>Color Scale:</strong>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginTop: '5px',
                    gap: '5px'
                }}>
                    <div style={{ 
                        width: '30px', 
                        height: '15px', 
                        background: 'linear-gradient(to right, blue, white)',
                        border: '1px solid #ccc'
                    }} />
                    <span style={{ fontSize: '11px' }}>Attractive</span>
                    <div style={{ 
                        width: '30px', 
                        height: '15px', 
                        background: 'linear-gradient(to right, white, red)',
                        border: '1px solid #ccc'
                    }} />
                    <span style={{ fontSize: '11px' }}>Repulsive</span>
                </div>
            </div>
        </div>
    );
};

export default EnergyLegend;

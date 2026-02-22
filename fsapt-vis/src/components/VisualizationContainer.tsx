import React, { useState } from 'react';
import MoleculeInput from './MoleculeInput';
import MolViewer from './MolViewer';
import EnergyLegend from './EnergyLegend';
import ComponentSelector from './ComponentSelector';

interface Energies {
    total: number[][];
    elst: number[][];
    exch: number[][];
    ind: number[][];
    disp: number[][];
}

interface AtomCounts {
    molecule_a: number;
    molecule_b: number;
}

interface TotalEnergies {
    total: number;
    elst: number;
    exch: number;
    ind: number;
    disp: number;
}

const VisualizationContainer: React.FC = () => {
    const [xyzCoordinates, setXyzCoordinates] = useState<string>('');
    const [energies, setEnergies] = useState<Energies | null>(null);
    const [atomCounts, setAtomCounts] = useState<AtomCounts | null>(null);
    const [totalEnergies, setTotalEnergies] = useState<TotalEnergies | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedEnergy, setSelectedEnergy] = useState<TotalEnergies | null>(null);
    const [selectedComponent, setSelectedComponent] = useState<'total' | 'elst' | 'exch' | 'ind' | 'disp'>('total');

    const handleCalculate = async (molStr: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:5000/predict-pairwise-energies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ molecule_string: molStr }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to fetch energies');
            }

            const data = await response.json();
            setEnergies(data.energies);
            setAtomCounts(data.atom_counts);
            setTotalEnergies(data.total_energies);
            setXyzCoordinates(data.xyz_coordinates);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAtomSelect = (indicesA: number[], indicesB: number[]) => {
        if (!energies) return;

        if (indicesA.length === 0 || indicesB.length === 0) {
            setSelectedEnergy(null);
            return;
        }

        let total = 0;
        let elst = 0;
        let exch = 0;
        let ind = 0;
        let disp = 0;

        indicesA.forEach(i => {
            indicesB.forEach(j => {
                if (i < energies.total.length && j < energies.total[0].length) {
                    total += energies.total[i][j];
                    elst += energies.elst[i][j];
                    exch += energies.exch[i][j];
                    ind += energies.ind[i][j];
                    disp += energies.disp[i][j];
                }
            });
        });

        setSelectedEnergy({ total, elst, exch, ind, disp });
    };

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100vh', 
            padding: '20px',
            backgroundColor: '#fafafa'
        }}>
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ margin: 0 }}>FSAPT Visualization with 3Dmol.js</h1>
                <p style={{ margin: '5px 0 0 0', color: '#666' }}>
                    Pairwise energy analysis using AP-Net2
                </p>
            </div>

            <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
                <div style={{ 
                    width: '350px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '15px',
                    overflowY: 'auto'
                }}>
                    <MoleculeInput onCalculate={handleCalculate} isLoading={loading} />

                    {error && (
                        <div style={{ 
                            color: '#d32f2f', 
                            backgroundColor: '#ffebee',
                            padding: '10px',
                            borderRadius: '5px',
                            border: '1px solid #ef9a9a'
                        }}>
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    <EnergyLegend totalEnergies={totalEnergies} />

                    <ComponentSelector 
                        selectedComponent={selectedComponent}
                        onComponentChange={setSelectedComponent}
                        disabled={!energies}
                    />

                    {selectedEnergy && (
                        <div style={{ 
                            border: '1px solid #ccc', 
                            padding: '15px', 
                            borderRadius: '5px',
                            backgroundColor: '#fff3e0'
                        }}>
                            <h3 style={{ marginTop: 0 }}>Selected Atoms Interaction</h3>
                            <p style={{ fontSize: '12px', color: '#666', marginTop: 0 }}>
                                Energy between selected atom groups
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <p style={{ margin: '5px 0' }}>
                                    <strong>Total:</strong> {selectedEnergy.total.toFixed(4)} kcal/mol
                                </p>
                                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                                    Elst: {selectedEnergy.elst.toFixed(4)}
                                </p>
                                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                                    Exch: {selectedEnergy.exch.toFixed(4)}
                                </p>
                                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                                    Ind: {selectedEnergy.ind.toFixed(4)}
                                </p>
                                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                                    Disp: {selectedEnergy.disp.toFixed(4)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ 
                    flex: 1, 
                    border: '1px solid #ddd', 
                    borderRadius: '8px', 
                    overflow: 'hidden',
                    backgroundColor: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    {xyzCoordinates ? (
                        <MolViewer
                            xyzString={xyzCoordinates}
                            energies={energies}
                            atomCounts={atomCounts}
                            onAtomSelect={handleAtomSelect}
                            selectedComponent={selectedComponent}
                        />
                    ) : (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            height: '100%',
                            color: '#999',
                            fontSize: '18px'
                        }}>
                            Enter molecule data and calculate energies to view visualization
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VisualizationContainer;

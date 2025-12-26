import React, { useState } from 'react';
import MoleculeInput from './MoleculeInput';
import MolViewer from './MolViewer';

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

const VisualizationContainer: React.FC = () => {
    const [moleculeString, setMoleculeString] = useState<string>('');
    const [energies, setEnergies] = useState<Energies | null>(null);
    const [atomCounts, setAtomCounts] = useState<AtomCounts | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedEnergy, setSelectedEnergy] = useState<{
        total: number;
        elst: number;
        exch: number;
        ind: number;
        disp: number;
    } | null>(null);

    const handleCalculate = async (molStr: string) => {
        setLoading(true);
        setError(null);
        setMoleculeString(molStr); // Store for viewer
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
                // Check bounds just in case
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '20px' }}>
            <h1>FSAPT Visualization</h1>

            <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <MoleculeInput onCalculate={handleCalculate} isLoading={loading} />

                    {error && <div style={{ color: 'red' }}>Error: {error}</div>}

                    {selectedEnergy && (
                        <div className="energy-display" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
                            <h3>Selected Interaction Energy</h3>
                            <p><strong>Total:</strong> {selectedEnergy.total.toFixed(4)} kcal/mol</p>
                            <p>Electrostatics: {selectedEnergy.elst.toFixed(4)}</p>
                            <p>Exchange: {selectedEnergy.exch.toFixed(4)}</p>
                            <p>Induction: {selectedEnergy.ind.toFixed(4)}</p>
                            <p>Dispersion: {selectedEnergy.disp.toFixed(4)}</p>
                        </div>
                    )}
                </div>

                <div style={{ flex: 1, border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                    <MolViewer
                        xyzString={moleculeString}
                        energies={energies}
                        atomCounts={atomCounts}
                        onAtomSelect={handleAtomSelect}
                    />
                </div>
            </div>
        </div>
    );
};

export default VisualizationContainer;

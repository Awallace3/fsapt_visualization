import React, { useState } from 'react';

interface MoleculeInputProps {
    onCalculate: (moleculeString: string) => void;
    isLoading: boolean;
}

const MoleculeInput: React.FC<MoleculeInputProps> = ({ onCalculate, isLoading }) => {
    const [moleculeString, setMoleculeString] = useState<string>(`0 1
O  -1.551007  -0.114520   0.000000
H  -1.934259   0.762503   0.000000
H  -0.599677   0.040712   0.000000
--
0 1
O   1.350625   0.111469   0.000000
H   1.680398  -0.373741  -0.758561
H   1.680398  -0.373741   0.758561`);

    return (
        <div className="molecule-input">
            <h3>Molecule Input (QCElemental String)</h3>
            <textarea
                value={moleculeString}
                onChange={(e) => setMoleculeString(e.target.value)}
                rows={10}
                style={{ width: '100%', fontFamily: 'monospace' }}
            />
            <button onClick={() => onCalculate(moleculeString)} disabled={isLoading}>
                {isLoading ? 'Calculating...' : 'Calculate Energies'}
            </button>
        </div>
    );
};

export default MoleculeInput;

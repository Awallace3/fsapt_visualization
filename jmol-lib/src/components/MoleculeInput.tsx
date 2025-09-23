import { useState } from 'react';

interface MoleculeInputProps {
  onSubmit: (moleculeString: string) => void;
  loading: boolean;
  error: string | null;
}

const MoleculeInput: React.FC<MoleculeInputProps> = ({ onSubmit, loading, error }) => {
  const [moleculeString, setMoleculeString] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (moleculeString.trim()) {
      onSubmit(moleculeString.trim());
    }
  };

  const loadExample = () => {
    const exampleMolecule = `0 1
8   -0.702196054   -0.056060256   0.009942262
1   -1.022193224   0.846775782   -0.011488714
1   0.257521062   0.042121496   0.005218999
--
0 1
8   2.268880784   0.026340101   0.000508029
1   2.645502399   -0.412039965   0.766632411
1   2.641145101   -0.449872874   -0.744894473`;
    setMoleculeString(exampleMolecule);
  };

  return (
    <div className="panel-section">
      <h3>Molecule Input</h3>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <textarea
          value={moleculeString}
          onChange={(e) => setMoleculeString(e.target.value)}
          placeholder="Enter qcelemental molecule string (with -- separator for dimer)"
          rows={12}
          style={{
            width: '100%',
            padding: '0.5rem',
            backgroundColor: '#1a1a1a',
            color: 'white',
            border: '1px solid #555',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            resize: 'vertical'
          }}
        />

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            type="submit"
            disabled={loading || !moleculeString.trim()}
            style={{
              flex: 1,
              padding: '0.5rem',
              backgroundColor: loading ? '#555' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Computing...' : 'Compute Energies'}
          </button>

          <button
            type="button"
            onClick={loadExample}
            style={{
              padding: '0.5rem',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Load Example
          </button>
        </div>
      </form>
    </div>
  );
};

export default MoleculeInput;
import { useEffect, useRef, useState } from 'react';
import { EnergyData, EnergyComponent, AtomSelection } from '../types/energy';

interface JSMolViewerProps {
  moleculeString: string;
  energyData: EnergyData | null;
  selectedComponent: EnergyComponent;
  atomSelection: AtomSelection;
  onAtomSelect: (moleculeType: 'A' | 'B', atomIndex: number) => void;
}

declare global {
  interface Window {
    Jmol: any;
  }
}

const JSMolViewer: React.FC<JSMolViewerProps> = ({
  moleculeString,
  energyData,
  selectedComponent,
  atomSelection,
  onAtomSelect
}) => {
  // TODO: Implement atom selection using onAtomSelect callback
  console.log('onAtomSelect available:', !!onAtomSelect);
  const viewerRef = useRef<HTMLDivElement>(null);
  const jmolAppletRef = useRef<any>(null);
  const [jsmolLoaded, setJsmolLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load JSMol script
  useEffect(() => {
    if (!window.Jmol) {
      console.log('Loading JSMol script...');
      setLoading(true);
      const script = document.createElement('script');
      script.src = 'https://chemapps.stolaf.edu/jmol/jsmol/JSmol.min.js';
      script.onload = () => {
        console.log('JSMol script loaded successfully');
        console.log('JSMol object available:', typeof window.Jmol);
        console.log('JSMol methods:', window.Jmol ? Object.getOwnPropertyNames(window.Jmol) : 'none');
        setJsmolLoaded(true);
        setLoading(false);
      };
      script.onerror = (e) => {
        console.error('Failed to load JSMol script:', e);
        setError('Failed to load 3D viewer library');
        setLoading(false);
      };
      document.head.appendChild(script);
    } else {
      console.log('JSMol already available');
      console.log('JSMol object available:', typeof window.Jmol);
      console.log('JSMol methods:', window.Jmol ? Object.getOwnPropertyNames(window.Jmol) : 'none');
      setJsmolLoaded(true);
      setLoading(false);
    }
  }, []);

  // Initialize JSMol when script is loaded
  useEffect(() => {
    if (jsmolLoaded && viewerRef.current && !jmolAppletRef.current) {
      try {
        // Calculate appropriate size for JSMol viewer
        const containerWidth = viewerRef.current.clientWidth || 800;
        const containerHeight = viewerRef.current.clientHeight || 600;
        console.log('Container size:', containerWidth, 'x', containerHeight);

        // Full size for better viewing
        const jsmolWidth = containerWidth;
        const jsmolHeight = containerHeight;

        console.log('Initializing JSMol with size:', jsmolWidth, 'x', jsmolHeight);

        // JSMol initialization
        const Info = {
          width: jsmolWidth,
          height: jsmolHeight,
          debug: false,
          backgroundColor: 'white',
          addSelectionOptions: false,
          use: 'HTML5',
          j2sPath: 'https://chemapps.stolaf.edu/jmol/jsmol/j2s',
          script: 'set antialiasDisplay true; background white;'
        };

        console.log('JSMol Info object:', Info);

        // Use standard JSMol.getAppletHtml
        const html = window.Jmol.getAppletHtml('jmolApplet', Info);
        if (viewerRef.current) {
          viewerRef.current.innerHTML = html;
          console.log('JSMol HTML inserted');

          // Wait for applet to be ready and set reference
          setTimeout(() => {
            jmolAppletRef.current = window.Jmol.getApplet('jmolApplet');
            if (jmolAppletRef.current) {
              console.log('Jmol applet initialized successfully');
              window.Jmol.script(jmolAppletRef.current, 'set picking SELECT;');
            } else {
              console.error('Failed to get Jmol applet reference');
              setError('Failed to initialize 3D viewer');
            }
          }, 1500);
        }

      } catch (error) {
        console.error('Failed to initialize JSMol:', error);
        setError('Failed to initialize 3D viewer: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  }, [jsmolLoaded]);

  // Load molecule when moleculeString changes
  useEffect(() => {
    if (jmolAppletRef.current && moleculeString.trim()) {
      try {
        console.log('Loading molecule...');
        // Convert qcelemental format to XYZ format for JSMol
        const xyzString = convertQcelementalToXYZ(moleculeString);
        const script = `load DATA "model"
${xyzString}
end "model";
zoom 100;
center;
spacefill 20%;
wireframe 0.15;
color atoms cpk;
select *;`;
        window.Jmol.script(jmolAppletRef.current, script);
        console.log('Molecule loaded successfully');
      } catch (error) {
        console.error('Failed to load molecule:', error);
        setError('Failed to load molecule: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  }, [moleculeString]);

  // Update atom colors when energy data or selected component changes
  useEffect(() => {
    if (jmolAppletRef.current && energyData && selectedComponent) {
      updateAtomColors();
    }
  }, [energyData, selectedComponent, jmolAppletRef.current]);

  // Update visual selection indicators
  useEffect(() => {
    if (jmolAppletRef.current && atomSelection) {
      updateSelectionHighlights();
    }
  }, [atomSelection]);

  const convertQcelementalToXYZ = (qcelString: string): string => {
    const lines = qcelString.trim().split('\n');
    let atomCount = 0;
    const xyzLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('0') || trimmed.startsWith('--')) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4) {
        const atomicNumber = parseInt(parts[0]);
        const element = getElementSymbol(atomicNumber);
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);

        xyzLines.push(`${element} ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`);
        atomCount++;
      }
    }

    return `${atomCount}\nMolecular Dimer\n${xyzLines.join('\n')}`;
  };

  const getElementSymbol = (atomicNumber: number): string => {
    const elements = [
      '', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
      'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca'
    ];
    return elements[atomicNumber] || `El${atomicNumber}`;
  };

  const updateAtomColors = () => {
    if (!energyData || !jmolAppletRef.current) return;

    // Simple coloring for now: color molecule A red, B blue
    // TODO: Color based on energy values
    const numA = energyData.atom_counts.molecule_a;
    const script = `
      select atomno 1-${numA}; color red;
      select atomno ${numA + 1}-*; color blue;
      select none;
    `;
    window.Jmol.script(jmolAppletRef.current, script);
  };

  const updateSelectionHighlights = () => {
    if (!jmolAppletRef.current) return;

    // Clear previous selections
    window.Jmol.script(jmolAppletRef.current, 'select none; set showSelections false;');

    // Highlight selected atoms
    const selectedAtoms: number[] = [];

    // Convert atom indices to JSMol atom numbers (0-based in selection, but atomno 1-based)
    atomSelection.moleculeA.forEach(index => selectedAtoms.push(index + 1));
    atomSelection.moleculeB.forEach(index => {
      if (energyData) {
        selectedAtoms.push(index + 1 + energyData.atom_counts.molecule_a);
      }
    });

    if (selectedAtoms.length > 0) {
      const atomList = selectedAtoms.join(' ');
      const script = `select atomno ${atomList}; spacefill 50%; color yellow;`;
      window.Jmol.script(jmolAppletRef.current, script);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        minHeight: '400px',
        minWidth: '600px',
        color: '#666',
        fontSize: '1.2rem'
      }}>
        Loading 3D viewer...
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffebee',
        borderRadius: '4px',
        minHeight: '400px',
        minWidth: '600px',
        color: '#c62828',
        fontSize: '1.2rem',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '1rem' }}>3D Viewer Error</div>
          <div>{error}</div>
          <div style={{ fontSize: '0.9rem', marginTop: '1rem', color: '#666' }}>
            Check browser console for details
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={viewerRef}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          minHeight: '400px',
          minWidth: '600px'
        }}
      />

      {!moleculeString && !error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#666',
          textAlign: 'center',
          fontSize: '1.2rem'
        }}>
          Enter a molecule string to visualize
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#c62828',
          textAlign: 'center',
          fontSize: '1rem',
          padding: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '4px',
          border: '1px solid #c62828'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>3D Viewer Error</div>
          <div>{error}</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#666' }}>
            Check browser console for details
          </div>
        </div>
      )}
    </div>
  );
};

export default JSMolViewer;

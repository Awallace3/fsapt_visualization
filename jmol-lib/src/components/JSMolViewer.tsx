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

        // Make JSMol smaller - 70% of container size, max 600x400
        const jsmolWidth = Math.min(containerWidth * 0.7, 600);
        const jsmolHeight = Math.min(containerHeight * 0.7, 400);

        console.log('Initializing JSMol with size:', jsmolWidth, 'x', jsmolHeight);

        // JSMol initialization
        const Info = {
          width: jsmolWidth + 'px',
          height: jsmolHeight + 'px',
          debug: true,  // Enable debug for troubleshooting
          color: 'black',  // White background instead of black
          addSelectionOptions: false,
          use: 'HTML5',
          j2sPath: 'https://chemapps.stolaf.edu/jmol/jsmol/j2s',
          script: `background black; set antialiasDisplay on; set displayCellParameters false;
                   set picking SELECT ATOM; set picking callback "atomPicked";
                   set antialiasDisplay on; set displayCellParameters false;`
        };

        console.log('JSMol Info object:', Info);

        // Try different JSMol initialization approaches
        try {
          console.log('Available JSMol methods:', Object.keys(window.Jmol));

          // Method 1: Try the modern JSMol API
          if (typeof window.Jmol.getAppletHtml === 'function') {
            console.log('Using JSMol.getAppletHtml method');
            const html = window.Jmol.getAppletHtml('jmolApplet', Info);
            if (viewerRef.current) {
              viewerRef.current.innerHTML = html;
              console.log('JSMol HTML inserted');
            }
          }
          // Method 2: Try setApplet with container
          else if (typeof window.Jmol.setApplet === 'function') {
            console.log('Using JSMol.setApplet method');
            jmolAppletRef.current = window.Jmol.setApplet(Info, viewerRef.current);
            console.log('JSMol applet created with setApplet:', typeof jmolAppletRef.current);
          }
          // Method 3: Try getApplet and check return type
          else if (typeof window.Jmol.getApplet === 'function') {
            console.log('Using JSMol.getApplet method');
            const applet = window.Jmol.getApplet('jmolApplet', Info);
            console.log('getApplet returned:', typeof applet, applet);

            if (viewerRef.current && typeof applet === 'string') {
              // If it returns HTML string, insert it
              viewerRef.current.innerHTML = applet;
              console.log('JSMol HTML string inserted');
            } else if (viewerRef.current && applet && typeof applet === 'object' && 'nodeType' in applet) {
              // If it's a DOM element, append it
              viewerRef.current.appendChild(applet);
              console.log('JSMol DOM element appended');
            } else {
              console.warn('Unexpected return type from getApplet');
            }
          } else {
            throw new Error('No suitable JSMol initialization method found');
          }
        } catch (initError) {
          console.error('JSMol initialization failed:', initError);
          const errorMessage = initError instanceof Error ? initError.message : 'Unknown error';
          setError(`Failed to create 3D viewer: ${errorMessage}`);
          return;
        }

        // Store reference for later use
        console.log('JSMol initialization completed successfully');

        // Set up atom selection callback with longer timeout
        setTimeout(() => {
          if (jmolAppletRef.current) {
            console.log('Setting up JSMol scripts...');
            try {
              window.Jmol.script(jmolAppletRef.current, `
                set picking SELECT ATOM;
                set picking callback "atomPicked";
                set antialiasDisplay on;
                set displayCellParameters false;
                background white;
              `);
              console.log('JSMol scripts executed successfully');
            } catch (scriptError) {
              console.error('Failed to execute JSMol script:', scriptError);
            }

            // Define the callback function
            (window as any).atomPicked = (atomInfo: string) => {
              console.log('Atom picked:', atomInfo);
              // Parse atom info and call onAtomSelect
              // This will need to be implemented based on JSMol's atom info format
            };
          }
        }, 2000); // Increased timeout for better initialization

      } catch (error) {
        console.error('Failed to initialize JSMol:', error);
        setError('Failed to initialize 3D viewer');
      }
    }
  }, [jsmolLoaded]);

  // Load molecule when moleculeString changes
  useEffect(() => {
    if (jmolAppletRef.current && moleculeString) {
      try {
        // Convert qcelemental format to XYZ format for JSMol
        const xyzString = convertQcelementalToXYZ(moleculeString);
        window.Jmol.script(jmolAppletRef.current, `load data "model"\\n${xyzString}\\nend "model"; spacefill 0.5;`);
      } catch (error) {
        console.error('Failed to load molecule:', error);
      }
    }
  }, [moleculeString]);

  // Update atom colors when energy data or selected component changes
  useEffect(() => {
    if (jmolAppletRef.current && energyData) {
      updateAtomColors();
    }
  }, [energyData, selectedComponent]);

  // Update visual selection indicators
  useEffect(() => {
    if (jmolAppletRef.current) {
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

    return `${atomCount}\\nConverted from qcelemental\\n${xyzLines.join('\\n')}`;
  };

  const getElementSymbol = (atomicNumber: number): string => {
    const elements = ['', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
                     'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar'];
    return elements[atomicNumber] || `El${atomicNumber}`;
  };

  const updateAtomColors = () => {
    if (!energyData) return;

    // For now, apply a simple color scheme
    // This will need to be enhanced to use actual energy values
    const colorScript = `
      select all;
      color atoms cpk;
      select none;
    `;

    window.Jmol.script(jmolAppletRef.current, colorScript);
  };

  const updateSelectionHighlights = () => {
    if (!jmolAppletRef.current) return;

    // Clear previous selections
    window.Jmol.script(jmolAppletRef.current, 'select none; halo off;');

    // Highlight selected atoms
    const selectedAtoms: number[] = [];

    // Convert atom indices to JSMol atom numbers (1-based)
    atomSelection.moleculeA.forEach(index => selectedAtoms.push(index + 1));
    atomSelection.moleculeB.forEach(index => {
      // Offset by molecule A atom count
      if (energyData) {
        selectedAtoms.push(index + 1 + energyData.atom_counts.molecule_a);
      }
    });

    if (selectedAtoms.length > 0) {
      const atomList = selectedAtoms.join(' ');
      window.Jmol.script(jmolAppletRef.current, `select atomno=${atomList}; halo on; color halo yellow;`);
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

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MolViewer } from "react-molviewer";
import { AtomSelection, EnergyComponent, EnergyData } from "../types/energy";

interface JSMolViewerProps {
  moleculeString: string;
  energyData: EnergyData | null;
  selectedComponent: EnergyComponent;
  atomSelection: AtomSelection;
  onAtomSelect: (moleculeType: "A" | "B", atomIndex: number) => void;
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
  onAtomSelect,
}) => {
  console.log("onAtomSelect available:", !!onAtomSelect);
  const [molContent, setMolContent] = useState<string>("");
  const [jmScripts, setJmScripts] = useState<string[]>([]);
  const [jsmolLoaded, setJsmolLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const jmolAppletRef = useRef<any>(null);

  // Load JSmol script
  useEffect(() => {
    if (!window.Jmol) {
      console.log('Loading JSmol script...');
      const script = document.createElement('script');
      script.src = 'https://chemapps.stolaf.edu/jmol/jsmol/JSmol.min.js';
      script.async = true;
      script.onload = () => {
        console.log('JSmol script loaded successfully');
        setJsmolLoaded(true);
      };
      script.onerror = (e) => {
        console.error('Failed to load JSmol script:', e);
        setError('Failed to load 3D viewer library');
      };
      document.head.appendChild(script);
    } else {
      console.log('JSmol already available');
      setJsmolLoaded(true);
    }
  }, []);

  const fnCb = useCallback((applet: any) => {
    console.log("MolViewer loaded, applet:", applet);
    jmolAppletRef.current = applet;

    // Set up atom picking
    window.Jmol.script(applet, `
      set picking atom;
      set pickingStyle SELECT;
      set pickingCallback myAtomPicked;
    `);

    // Define the picking callback
    (window as any).myAtomPicked = (T: any, info: string) => {
      console.log('Atom picked:', info);
      try {
        // Parse atom number from info (e.g., "atomno=5" or more complex)
        const match = info.match(/atomno=(\d+)/);
        if (match && energyData) {
          const atomNo = parseInt(match[1]);
          const numA = energyData.atom_counts.molecule_a;
          const moleculeType = atomNo <= numA ? 'A' : 'B';
          const atomIndex = atomNo - 1 - (moleculeType === 'B' ? numA : 0);
          onAtomSelect(moleculeType, atomIndex);
        }
      } catch (e) {
        console.error('Error parsing picked atom:', e);
      }
    };

    setLoading(false);
  }, [energyData, onAtomSelect]);

  const fnInit = useCallback(() => {
    console.log("MolViewer initializing");
    setLoading(true);
  }, []);

  // Convert and set molecule content when moleculeString changes
  useEffect(() => {
    if (moleculeString.trim()) {
      try {
        console.log("Converting molecule...");
        const xyzString = convertQcelementalToXYZ(moleculeString);
        console.log("Converted XYZ:", xyzString);
        setMolContent(xyzString);
        // Initial scripts for display
        setJmScripts([
          "zoom 100",
          "center",
          "spacefill 20%",
          "wireframe 0.15",
          "color atoms cpk",
          "set antialiasDisplay true",
          "background grey",
        ]);
        console.log("Molecule content set");
      } catch (error) {
        console.error("Failed to convert molecule:", error);
        setError(
          "Failed to load molecule: " +
            (error instanceof Error ? error.message : "Unknown error"),
        );
      }
    } else {
      setMolContent("");
      setJmScripts([]);
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
  }, [atomSelection, jmolAppletRef.current]);

  const convertQcelementalToXYZ = (qcelString: string): string => {
    const lines = qcelString.trim().split("\n");
    let atomCount = 0;
    const xyzLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("0") || trimmed.startsWith("--")) {
        continue;
      }

      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4) {
        const atomicNumber = parseInt(parts[0]);
        const element = getElementSymbol(atomicNumber);
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);

        xyzLines.push(
          `${element} ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`,
        );
        atomCount++;
      }
    }

    return `${atomCount}\nMolecular Dimer\n${xyzLines.join("\n")}`;
  };

  const getElementSymbol = (atomicNumber: number): string => {
    const elements = [
      "",
      "H",
      "He",
      "Li",
      "Be",
      "B",
      "C",
      "N",
      "O",
      "F",
      "Ne",
      "Na",
      "Mg",
      "Al",
      "Si",
      "P",
      "S",
      "Cl",
      "Ar",
      "K",
      "Ca",
    ];
    return elements[atomicNumber] || `El${atomicNumber}`;
  };

  const updateAtomColors = () => {
    if (!energyData || !jmolAppletRef.current || atomSelection.moleculeA.length === 0 && atomSelection.moleculeB.length === 0) {
      // Default coloring if no selection
      const numA = energyData.atom_counts.molecule_a;
      const defaultScript = `select atomno 1-${numA}; color cpk; select atomno ${numA + 1}-*; color cpk; select none;`;
      window.Jmol.script(jmolAppletRef.current, defaultScript);
      return;
    }

    const numA = energyData.atom_counts.molecule_a;
    const energies = energyData.energies[selectedComponent];

    // Color atoms in A based on sum of interactions with selected B atoms
    atomSelection.moleculeA.forEach(atomA => {
      let totalEnergy = 0;
      let pairCount = 0;
      atomSelection.moleculeB.forEach(atomB => {
        if (atomA < energies.length && atomB < energies[atomA].length) {
          totalEnergy += energies[atomA][atomB];
          pairCount++;
        }
      });
      const avgEnergy = pairCount > 0 ? totalEnergy / pairCount : 0;
      const color = getColorForEnergy(avgEnergy);
      const atomNo = atomA + 1;
      window.Jmol.script(jmolAppletRef.current, `select atomno ${atomNo}; color ${color};`);
    });

    // Color atoms in B based on sum of interactions with selected A atoms
    atomSelection.moleculeB.forEach(atomB => {
      let totalEnergy = 0;
      let pairCount = 0;
      atomSelection.moleculeA.forEach(atomA => {
        if (atomA < energies.length && atomB < energies[atomA].length) {
          totalEnergy += energies[atomA][atomB];
          pairCount++;
        }
      });
      const avgEnergy = pairCount > 0 ? totalEnergy / pairCount : 0;
      const color = getColorForEnergy(avgEnergy);
      const atomNo = numA + atomB + 1;
      window.Jmol.script(jmolAppletRef.current, `select atomno ${atomNo}; color ${color};`);
    });

    // Reset unselected atoms to default
    const allAtomsScript = `select none; color cpk;`;
    window.Jmol.script(jmolAppletRef.current, allAtomsScript);
  };

  const getColorForEnergy = (energy: number): string => {
    // Map energy to RGB: blue for negative (attractive), red for positive (repulsive), white for near zero
    let r = 0, g = 0, b = 0;
    const absEnergy = Math.abs(energy);
    const maxEnergy = 0.5; // Adjust based on typical energy ranges

    if (energy < 0) {
      // Attractive: blue scale
      b = 255;
      r = Math.min(255, (absEnergy / maxEnergy) * 255);
    } else if (energy > 0) {
      // Repulsive: red scale
      r = 255;
      b = Math.min(255, (absEnergy / maxEnergy) * 255 * -1 + 255); // Fade to white
    } else {
      // Neutral: white/gray
      r = g = b = 200;
    }

    return `[${Math.round(r)} ${Math.round(g)} ${Math.round(b)}]`;
  };

  const updateSelectionHighlights = () => {
    if (!jmolAppletRef.current) return;

    // Clear previous selections
    window.Jmol.script(
      jmolAppletRef.current,
      "select none; set showSelections false;",
    );

    // Highlight selected atoms
    const selectedAtoms: number[] = [];

    // Convert atom indices to JSMol atom numbers (0-based in selection, but atomno 1-based)
    atomSelection.moleculeA.forEach((index) => selectedAtoms.push(index + 1));
    atomSelection.moleculeB.forEach((index) => {
      if (energyData) {
        selectedAtoms.push(index + 1 + energyData.atom_counts.molecule_a);
      }
    });

    if (selectedAtoms.length > 0) {
      const atomList = selectedAtoms.join(" ");
      const highlightScript = `select atomno ${atomList}; spacefill 50%; color yellow;`;
      window.Jmol.script(jmolAppletRef.current, highlightScript);
    }
  };

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#ffebee",
          borderRadius: "4px",
          minHeight: "400px",
          minWidth: "600px",
          color: "#c62828",
          fontSize: "1.2rem",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div>
          <div style={{ fontWeight: "bold", marginBottom: "1rem" }}>
            3D Viewer Error
          </div>
          <div>{error}</div>
          <div style={{ fontSize: "0.9rem", marginTop: "1rem", color: "#666" }}>
            Check browser console for details
          </div>
        </div>
      </div>
    );
  }

  if (!jsmolLoaded) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          minHeight: "400px",
          minWidth: "600px",
          color: "#666",
          fontSize: "1.2rem",
        }}
      >
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "400px",
        minWidth: "600px",
        position: "relative",
      }}
    >
      {molContent ? (
        <MolViewer
          molContent={molContent}
          viewType="mol"
          fnInit={fnInit}
          fnCb={fnCb}
          jmScripts={jmScripts}
        />
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
            height: "100%",
            color: "#666",
            fontSize: "1.2rem",
          }}
        >
          Enter a molecule string to visualize
        </div>
      )}
      {loading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#666",
            fontSize: "1.2rem",
            zIndex: 10,
            backgroundColor: "rgba(255, 255, 255, 0.8)",
          }}
        >
        </div>
      )}
    </div>
  );
};

export default JSMolViewer;

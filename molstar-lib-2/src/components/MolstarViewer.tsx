import React, { useCallback, useEffect, useRef, useState } from "react";
import { PluginContext } from "molstar/lib/mol-plugin/context";
import { DefaultPluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PluginCommands } from "molstar/lib/mol-plugin/commands";
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms";
import { ColorThemeName } from "molstar/lib/mol-util/color";
import { ParamDefinition as PD } from "molstar/lib/mol-util/param-definition";
import { Color } from "molstar/lib/mol-util/color";
import { PickingId } from "molstar/lib/mol-util/picking";
import type { StateObjectRef } from "molstar/lib/mol-state";
import { AtomSelection, EnergyComponent, EnergyData } from "../types/energy";

interface MolstarViewerProps {
  moleculeString: string;
  energyData: EnergyData | null;
  selectedComponent: EnergyComponent;
  atomSelection: AtomSelection;
  onAtomSelect: (moleculeType: "A" | "B", atomIndex: number) => void;
}

const MolstarViewer: React.FC<MolstarViewerProps> = ({
  moleculeString,
  energyData,
  selectedComponent,
  atomSelection,
  onAtomSelect,
}) => {
  const [molContent, setMolContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pluginRef = useRef<PluginContext | null>(null);
  const structureRef = useRef<StateObjectRef | null>(null);
  const reprRef = useRef<StateObjectRef | null>(null);

  // Convert QCElemental to XYZ (same as original)
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

        xyzLines.push(`${element} ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`);
        atomCount++;
      }
    }

    return `${atomCount}\nMolecular Dimer\n${xyzLines.join("\n")}`;
  };

  const getElementSymbol = (atomicNumber: number): string => {
    const elements = [
      "", "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne",
      "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca"
    ];
    return elements[atomicNumber] || `El${atomicNumber}`;
  };

  // Custom color theme for energy
  const EnergyColorTheme = {
    name: "energy" as ColorThemeName,
    params: () => ({
      energyData: PD.Array(PD.Numeric(0, {}, { min: -1, max: 1 }), { isHidden: true }),
    }),
    factory: (_ctx: any, params: any) => ({
      create: (location: any) => {
        const energy = params.energyData[location.aIndex] || 0;
        // Blue for negative (attractive), red for positive (repulsive)
        if (energy < 0) {
          const intensity = Math.min(1, Math.abs(energy) / 0.5);
          return Color.fromNormalizedRgb(intensity * 0.2, intensity * 0.2, 1); // Blue
        } else {
          const intensity = Math.min(1, energy / 0.5);
          return Color.fromNormalizedRgb(1, intensity * 0.2, intensity * 0.2); // Red
        }
      },
    }),
  };

  // Initialize plugin
  const initPlugin = useCallback(async () => {
    if (!canvasRef.current) return null;

    const plugin = new PluginContext(new DefaultPluginUIContext(canvasRef.current));
    pluginRef.current = plugin;

    // Register custom color theme
    (plugin as any).customColorThemes.register(EnergyColorTheme);

    // Picking handler
    plugin.behaviors.layout.picking.setPickingHandler((picking: PickingId | undefined) => {
      if (picking?.group === "atom" && energyData) {
        const atomIndex = picking.id as number; // aIndex
        const numA = energyData.atom_counts.molecule_a;
        const moleculeType = atomIndex < numA ? "A" : "B";
        const localIndex = atomIndex - (moleculeType === "B" ? numA : 0);
        onAtomSelect(moleculeType, localIndex);
      }
    });

    await plugin.init({
      config: [["enableDebug", false]],
      layout: { initial: { isExpanded: false, showControls: false } },
    });

    return plugin;
  }, [energyData, onAtomSelect]);

  // Load molecule
  const loadMolecule = useCallback(async (plugin: PluginContext) => {
    try {
      setLoading(true);
      setError(null);

      await plugin.clear();

      const data = { data: molContent };
      const trajectory = await plugin.builders.data.rawData(data, "xyz").run();
      const model = await plugin.builders.structure.createModel(trajectory);
      structureRef.current = await plugin.builders.structure.createStructure(model);
      reprRef.current = await plugin.builders.structure.representation(structureRef.current!, { type: "ball+stick" });

      await plugin.builders.structure.applyPreset(structureRef.current!, "default");

      await updateColors(plugin);

      await plugin.commands.dispatch({
        type: PluginCommands.Camera.Reset,
        ref: structureRef.current!,
      });

      setLoading(false);
    } catch (err: any) {
      setError("Failed to load molecule: " + (err.message || "Unknown error"));
      setLoading(false);
    }
  }, [molContent]);

  // Compute per-atom energies for coloring
  const computeAtomEnergies = useCallback((): number[] => {
    if (!energyData || (atomSelection.moleculeA.length === 0 && atomSelection.moleculeB.length === 0)) {
      const totalAtoms = energyData?.atom_counts.molecule_a + energyData?.atom_counts.molecule_b || 0;
      return new Array(totalAtoms).fill(0);
    }

    const numA = energyData.atom_counts.molecule_a;
    const numB = energyData.atom_counts.molecule_b;
    const totalAtoms = numA + numB;
    const energies = energyData.energies[selectedComponent];
    const atomEnergies = new Array(totalAtoms).fill(0);

    // Color atoms in A based on avg with selected B
    atomSelection.moleculeA.forEach((atomA: number) => {
      let totalEnergy = 0;
      let pairCount = 0;
      atomSelection.moleculeB.forEach((atomB: number) => {
        if (atomA < energies.length && atomB < energies[atomA].length) {
          totalEnergy += energies[atomA][atomB];
          pairCount++;
        }
      });
      atomEnergies[atomA] = pairCount > 0 ? totalEnergy / pairCount : 0;
    });

    // Color atoms in B based on avg with selected A
    atomSelection.moleculeB.forEach((atomB: number) => {
      let totalEnergy = 0;
      let pairCount = 0;
      atomSelection.moleculeA.forEach((atomA: number) => {
        if (atomA < energies.length && atomB < energies[atomA].length) {
          totalEnergy += energies[atomA][atomB];
          pairCount++;
        }
      });
      atomEnergies[numA + atomB] = pairCount > 0 ? totalEnergy / pairCount : 0;
    });

    return atomEnergies;
  }, [energyData, atomSelection, selectedComponent]);

  // Update colors
  const updateColors = useCallback(async (plugin: PluginContext) => {
    if (!reprRef.current) return;

    const atomEnergies = computeAtomEnergies();
    const colorParams = { energyData: atomEnergies };

    // Update the color theme on the representation
    await plugin.updateTreeState(reprRef.current, [{
      ref: reprRef.current,
      type: StateTransforms.Representation.ColorTheme,
      params: { colorTheme: { name: "energy" as ColorThemeName, params: colorParams } },
    }]);
  }, [computeAtomEnergies]);

  // Update selection highlights (placeholder - full impl needs selection creation)
  const updateHighlights = useCallback(async (plugin: PluginContext) => {
    if (!energyData || !structureRef.current) return;

    const numA = energyData.atom_counts.molecule_a;
    const selectedAtoms = [
      ...atomSelection.moleculeA,
      ...atomSelection.moleculeB.map(i => numA + i)
    ];

    // TODO: Create selection for selectedAtoms and add yellow ball representation with larger radius
    console.log("Would highlight atoms:", selectedAtoms);
  }, [energyData, atomSelection]);

  // Effects
  useEffect(() => {
    if (moleculeString.trim()) {
      try {
        const xyz = convertQcelementalToXYZ(moleculeString);
        setMolContent(xyz);
        setError(null);
      } catch (err: any) {
        setError("Failed to convert molecule: " + (err.message || "Unknown error"));
      }
    } else {
      setMolContent("");
    }
  }, [moleculeString]);

  useEffect(() => {
    if (molContent && !loading) {
      initPlugin().then(plugin => {
        if (plugin) {
          loadMolecule(plugin);
        }
      }).catch((err: any) => {
        setError("Failed to initialize viewer: " + (err.message || "Unknown error"));
      });
    }
  }, [molContent, initPlugin, loadMolecule]);

  useEffect(() => {
    if (pluginRef.current && reprRef.current) {
      updateColors(pluginRef.current);
      updateHighlights(pluginRef.current);
    }
  }, [atomSelection, selectedComponent, updateColors, updateHighlights]);

  useEffect(() => {
    return () => {
      pluginRef.current?.dispose();
      pluginRef.current = null;
    };
  }, []);

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
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: loading ? "none" : "block" }}
      />
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
          Loading 3D viewer...
        </div>
      )}
      {!molContent && !loading && !error && (
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
    </div>
  );
};

export default MolstarViewer;

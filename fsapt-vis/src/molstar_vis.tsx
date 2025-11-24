import React, { useEffect, useRef, useState } from "react";
import { ColorTheme } from "molstar/src/mol-theme/color";
import { Plugin } from "molstar/src/mol-plugin-ui/plugin";
import {
  Structure,
} from "molstar/src/mol-model/structure";
import { PluginStateObject as PSO } from "molstar/src/mol-plugin-state/objects";
import { type PluginLayoutControlsDisplay } from "molstar/src/mol-plugin/layout";
import { PluginUIContext } from "molstar/src/mol-plugin-ui/context";
import {
  DefaultPluginUISpec,
  type PluginUISpec,
} from "molstar/src/mol-plugin-ui/spec";
import { PluginBehaviors } from "molstar/src/mol-plugin/behavior";
import { PluginConfig } from "molstar/src/mol-plugin/config";
import { PluginSpec } from "molstar/src/mol-plugin/spec";
import { ColorNames } from "molstar/src/mol-util/color/names";
import { Theme } from "molstar/src/mol-theme/theme";
import { Color } from "molstar/src/mol-util/color";
import "molstar/src/mol-util/polyfill";
import { ObjectKeys } from "molstar/src/mol-util/type-helpers";
import { StructureFocusRepresentation } from "molstar/src/mol-plugin/behavior/dynamic/selection/structure-focus-representation";
import {
  type CustomAtomColorThemeParams,
  CustomPerAtomColorThemeProvider,
  CustomPerAtomColorTheme,
  getPerAtomColorThemeParams,
} from "./fsaptColorTheme.tsx";
import {
  createStructureColorThemeParams,
  createStructureRepresentationParams,
} from "molstar/src/mol-plugin-state/helpers/structure-representation-params";
import { ParamDefinition as PD } from "molstar/src/mol-util/param-definition";
import { atoms } from "molstar/src/mol-model/structure/query/queries/generators";
import { QueryContext } from "molstar/src/mol-model/structure/query/context";
import { Script } from "molstar/src/mol-script/script";
import { AtomIdColorThemeProvider, AtomIdColorTheme } from "molstar/src/mol-theme/color/atom-id"

interface FsaptData {
  atom_indices: number[];
  energy_contributions: number[];
  interaction_type: string;
  threshold?: number;
  source_indices?: number[];
}

interface AtomData {
  element: string;
  x: number;
  y: number;
  z: number;
  originalIndex: number;
}

function extractAtomsFromSelection(plugin: PluginUIContext): AtomData[] {
  let selectionStructure: Structure | undefined;

  // Inspect selection manager
  const selectionManager = plugin.managers.structure.selection;

  // Try to access entries if it exists (it's private but might be accessible in JS)
  const entries = (selectionManager as any).entries;
  if (entries && entries instanceof Map) {
    entries.forEach((value, key) => {
      if (value.selection && value.selection.elementCount > 0) {
        // Find structure with this ID
        const structRef = plugin.managers.structure.hierarchy.current.structures.find(s => s.cell.id === key);
        if (structRef) {
          const s = selectionManager.getStructure(structRef);
          if (s) {
            selectionStructure = s;
          }
        }
      }
    });
  }

  if (!selectionStructure) {
    // Fallback: if we have only one structure and one selection entry, assume they match.
    if (entries && entries instanceof Map && entries.size > 0 && plugin.managers.structure.hierarchy.current.structures.length === 1) {
      const entry = entries.values().next().value;
      if (entry && entry.selection && entry.selection.elementCount > 0) {
        const current = plugin.managers.structure.hierarchy.current.structures[0];
        // Try to force get structure
        selectionStructure = selectionManager.getStructure(current);
        if (!selectionStructure) {
          // If getStructure fails, maybe we can construct it?
          // But we need access to internal methods.
          // Let's try to use the selection directly with the current structure.
          // But we need a Structure object to iterate.
          // Maybe we can use the 'structure' property of the entry if it exists?
          if ((entry as any).structure) {
            selectionStructure = (entry as any).structure; // This might be the selection structure?
          }
        }
      }
    }
  }
  if (!selectionStructure) {
    const currentStructure = plugin.managers.structure.hierarchy.current.structures[0];
    if (currentStructure) {
      selectionStructure = selectionManager.getStructure(currentStructure);
    }
  }

  if (!selectionStructure) {
    return [];
  }

  const atoms: AtomData[] = [];

  // We need the model to map indices.
  // The selectionStructure is a subset of the root structure.
  // We can get the parent model from it.

  try {
    // We need to map back to the original structure's indices.
    // The selectionStructure units contain elements.
    // We can just iterate them and get the properties.
    // But we need the "originalIndex" which we defined as global index in the root structure.

    // Let's rebuild the global map from the root structure of the selection
    // (assuming selection comes from one root)
    const rootStructure = selectionStructure.parent; // or use the one from hierarchy

    // Fallback to hierarchy if parent is not set (it should be)
    const rootStructData = rootStructure || plugin.managers.structure.hierarchy.current.structures[0].cell.obj?.data;

    if (!rootStructData) {
      return [];
    }

    const globalIndexMap = new Map<string, number>();
    let globalIndex = 0;
    for (const unit of rootStructData.units) {
      for (let i = 0; i < unit.elements.length; i++) {
        const modelAtomIndex = unit.elements[i];
        globalIndexMap.set(`${unit.id}-${modelAtomIndex}`, globalIndex);
        globalIndex++;
      }
    }

    Structure.eachAtomicHierarchyElement(selectionStructure, {
      atom: (location) => {
        const { unit, element } = location;
        const x = unit.conformation.coordinates.x[element];
        const y = unit.conformation.coordinates.y[element];
        const z = unit.conformation.coordinates.z[element];
        const typeSymbol = unit.model.atomicHierarchy.atoms.type_symbol.value(unit.elements[element]);

        const modelAtomIndex = unit.elements[element];
        const originalIndex = globalIndexMap.get(`${unit.id}-${modelAtomIndex}`);

        if (originalIndex !== undefined) {
          atoms.push({
            element: typeSymbol,
            x, y, z,
            originalIndex
          });
        }
      }
    });
  } catch (e) {
    console.error("Error iterating selection:", e);
  }
  return atoms;
}

const DefaultViewerOptions = {
  extensions: ObjectKeys({}),
  layoutControlsDisplay: "reactive" as PluginLayoutControlsDisplay,

  viewportShowExpand: PluginConfig.Viewport.ShowExpand.defaultValue,
  viewportShowControls: PluginConfig.Viewport.ShowControls.defaultValue,
  viewportShowSettings: PluginConfig.Viewport.ShowSettings.defaultValue,
  viewportShowSelectionMode:
    PluginConfig.Viewport.ShowSelectionMode.defaultValue,
  viewportShowAnimation: PluginConfig.Viewport.ShowAnimation.defaultValue,
  pluginStateServer: PluginConfig.State.DefaultServer.defaultValue,
  volumeStreamingServer:
    PluginConfig.VolumeStreaming.DefaultServer.defaultValue,
  pdbProvider: PluginConfig.Download.DefaultPdbProvider.defaultValue,
  emdbProvider: PluginConfig.Download.DefaultEmdbProvider.defaultValue,
};
const defaultSpec = DefaultPluginUISpec();
const o = {
  ...DefaultViewerOptions,
  ...{
    layoutIsExpanded: true,
    layoutShowControls: false,
    layoutShowRemoteState: true,
    layoutShowSequence: true,
    layoutShowLog: true,
    layoutShowLeftPanel: true,

    viewportShowExpand: true,
    viewportShowControls: true,
    viewportShowSettings: true,
    viewportShowSelectionMode: true,
    viewportShowAnimation: true,
  },
};

const spec: PluginUISpec = {
  actions: defaultSpec.actions,
  behaviors: [
    // Turns residues to ball-and-stick within 5 angstroms
    // PluginSpec.Behavior(StructureFocusRepresentation),

    PluginSpec.Behavior(PluginBehaviors.Representation.HighlightLoci),
    PluginSpec.Behavior(PluginBehaviors.Representation.SelectLoci),
    PluginSpec.Behavior(
      PluginBehaviors.Representation.DefaultLociLabelProvider,
    ),
    PluginSpec.Behavior(PluginBehaviors.Representation.FocusLoci),
    PluginSpec.Behavior(PluginBehaviors.Camera.FocusLoci),
    PluginSpec.Behavior(PluginBehaviors.Camera.CameraAxisHelper),
    PluginSpec.Behavior(PluginBehaviors.Camera.CameraControls),
    PluginSpec.Behavior(PluginBehaviors.CustomProps.StructureInfo),
    PluginSpec.Behavior(PluginBehaviors.CustomProps.AccessibleSurfaceArea),
    PluginSpec.Behavior(
      PluginBehaviors.CustomProps.BestDatabaseSequenceMapping,
    ),
    PluginSpec.Behavior(PluginBehaviors.CustomProps.Interactions),
    PluginSpec.Behavior(PluginBehaviors.CustomProps.SecondaryStructure),
    PluginSpec.Behavior(PluginBehaviors.CustomProps.ValenceModel),
    PluginSpec.Behavior(PluginBehaviors.CustomProps.CrossLinkRestraint),
  ],
  animations: defaultSpec.animations,
  customParamEditors: defaultSpec.customParamEditors,
  layout: {
    initial: {
      isExpanded: o.layoutIsExpanded,
      showControls: o.layoutShowControls,
      controlsDisplay: o.layoutControlsDisplay,
    },
  },
  components: {
    ...defaultSpec.components,
    controls: {
      ...defaultSpec.components?.controls,
      top: o.layoutShowSequence ? undefined : "none",
      bottom: o.layoutShowLog ? undefined : "none",
      left: o.layoutShowLeftPanel ? undefined : "none",
    },
    remoteState: o.layoutShowRemoteState ? "default" : "none",
    // viewport: {
    //   view: ViewportComponent,
    // },
  },
  config: [
    // [PluginConfig.Viewport.ShowExpand, o.viewportShowExpand],
    // [PluginConfig.Viewport.ShowControls, o.viewportShowControls],
    // [PluginConfig.Viewport.ShowSettings, o.viewportShowSettings],
    // [PluginConfig.Viewport.ShowSelectionMode, o.viewportShowSelectionMode],
    // [PluginConfig.Viewport.ShowAnimation, o.viewportShowAnimation],
    // [PluginConfig.State.DefaultServer, o.pluginStateServer],
    // [PluginConfig.State.CurrentServer, o.pluginStateServer],
    // [PluginConfig.VolumeStreaming.DefaultServer, o.volumeStreamingServer],
    // [PluginConfig.Download.DefaultPdbProvider, o.pdbProvider],
    // [PluginConfig.Download.DefaultEmdbProvider, o.emdbProvider],
    [PluginConfig.Viewport.ShowExpand, true],
    [PluginConfig.Viewport.ShowControls, true],
    [PluginConfig.Viewport.ShowSettings, true],
    [PluginConfig.Viewport.ShowSelectionMode, true],
    [PluginConfig.Viewport.ShowAnimation, true],
    [PluginConfig.Viewport.ShowTrajectoryControls, true],
    [PluginConfig.Viewport.ShowScreenshotControls, true],

    [PluginConfig.State.DefaultServer, true],
    [PluginConfig.State.CurrentServer, true],

    [PluginConfig.VolumeStreaming.DefaultServer, true],

    [PluginConfig.Download.DefaultPdbProvider, true],
    [PluginConfig.Download.DefaultEmdbProvider, true],
  ],
};

export async function loadStructure(
  ctx: PluginUIContext,
  url: string,
  options?: { format?: string; isBinary?: boolean },
) {
  console.log(`Loading structure from ${url} (format: ${options?.format})`);
  try {
    const data = await ctx.builders.data.download({
      url,
      isBinary: options?.isBinary,
    });

    const trajectory = await ctx.builders.structure.parseTrajectory(
      data,
      options?.format ?? ("mmcif" as any),
    );
    console.log("Trajectory parsed:", trajectory);

    // Try 'default' preset
    const structure = await ctx.builders.structure.hierarchy.applyPreset(
      trajectory,
      "default",
    );
    console.log("applyPreset 'default' result:", structure);

    if (!structure) {
      console.warn("applyPreset 'default' returned undefined");
      return undefined;
    }

    console.log("Returning structure from loadStructure:", structure);
    return structure;
  } catch (e) {
    console.error("Error in loadStructure:", e);
    throw e;
  }
}


export async function applyFsaptColoring(
  plugin: PluginUIContext,
  fsaptData: FsaptData,
) {
  const structures = plugin.managers.structure.hierarchy.current.structures;
  if (structures.length === 0) {
    throw new Error("No structure loaded");
  }

  console.log("FSAPT Data received:", fsaptData);

  // Calculate colors
  const colors: Color[] = [];
  const indices: number[] = [];

  // 1. Color Source Atoms (Monomer A) - Green
  if (fsaptData.source_indices) {
    fsaptData.source_indices.forEach(idx => {
      indices.push(idx);
      colors.push(ColorNames.green);
    });
  }

  // 2. Color Target Atoms (Monomer B) - Gradient
  const maxAbsEnergy = Math.max(
    ...fsaptData.energy_contributions.map(e => Math.abs(e)),
    0.001
  );
  const scale = fsaptData.threshold || maxAbsEnergy;

  fsaptData.energy_contributions.forEach((e, i) => {
    const idx = fsaptData.atom_indices[i];
    indices.push(idx);

    let c: Color;
    if (e < 0) {
      // Attractive (Blue)
      const ratio = Math.min(Math.abs(e) / scale, 1);
      c = Color.interpolate(ColorNames.white, ColorNames.blue, ratio);
    } else {
      // Repulsive (Red)
      const ratio = Math.min(e / scale, 1);
      c = Color.interpolate(ColorNames.white, ColorNames.red, ratio);
    }
    colors.push(c);
  });

  const themeParams = {
    indices: indices,
    colors: colors,
  };

  const componentManager = plugin.managers.structure.component;
  for (const structure of componentManager.currentStructures) {
    const components = structure.components;
    // Update all representations to use the new color theme
    plugin.managers.structure.component.updateRepresentationsTheme(components, {
      color: 'custom-per-atom-color',
      colorParams: themeParams
    });
  }
}

interface ControlPanelProps {
  plugin: PluginUIContext | null;
}

interface StatusMessage {
  message: string;
  type: "success" | "error" | "info";
}

const ControlPanel: React.FC<ControlPanelProps> = ({ plugin }) => {
  const [structureUrl, setStructureUrl] = useState(
    "http://localhost:5173/default.xyz",
  );
  const [structureFormat, setStructureFormat] = useState("xyz");
  const [ligandId, setLigandId] = useState("LIG");
  const [proteinId, setProteinId] = useState("PROT_001");
  const [apiUrl, setApiUrl] = useState("http://localhost:5000");
  const [threshold, setThreshold] = useState(0.5);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const structRef = useRef<Structure | undefined>(undefined);

  const [selectedAtomsA, setSelectedAtomsA] = useState<AtomData[]>([]);
  const [selectedAtomsB, setSelectedAtomsB] = useState<AtomData[]>([]);

  const handleSetMonomer = (monomer: 'A' | 'B') => {
    if (!plugin) return;
    const atoms = extractAtomsFromSelection(plugin);
    if (atoms.length === 0) {
      showStatus(`No atoms selected for Monomer ${monomer}`, "error");
      return;
    }
    if (monomer === 'A') {
      setSelectedAtomsA(atoms);
      showStatus(`Set Monomer A(${atoms.length} atoms)`, "success");
    } else {
      setSelectedAtomsB(atoms);
      showStatus(`Set Monomer B(${atoms.length} atoms)`, "success");
    }
    // Clear selection
    plugin.managers.structure.selection.clear();
  };

  const showStatus = (message: string, type: StatusMessage["type"]) => {
    setStatus({ message, type });
    if (type === "info") {
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const handleLoadStructure = async () => {
    if (!plugin) {
      showStatus("❌ Plugin not initialized", "error");
      return;
    }

    setIsLoading(true);
    showStatus("Loading structure...", "info");
    try {
      const isBinary = structureFormat === "bcif";
      const s = await loadStructure(plugin, structureUrl, {
        format: structureFormat,
        isBinary,
      });
      console.log("Result in handleLoadStructure:", s);
      structRef.current = s;
      // Get polymer representation
      showStatus("✅ Structure loaded successfully!", "success");
    } catch (error) {
      showStatus(
        `❌ Error loading structure: ${error instanceof Error ? error.message : "Unknown error"
        } `,
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };
  // console.log("Loaded structure:", structRef.current);
  // if (structRef.current != undefined) {
  //   // console.log("Plugin and structure are ready.");
  //   // logStructureData(plugin);
  //   // console.log("Locations:", structRef.current.elementLocations);
  // }

  const handleFsaptVisualization = async () => {
    if (!plugin) {
      showStatus("❌ Plugin not initialized", "error");
      return;
    }

    if (selectedAtomsA.length === 0 || selectedAtomsB.length === 0) {
      showStatus("❌ Please set both Monomer A and Monomer B", "error");
      return;
    }

    setIsLoading(true);
    showStatus("🔄 Fetching FSAPT data...", "info");

    try {
      // Construct molecule string
      const formatAtom = (a: AtomData) => `${a.element} ${a.x.toFixed(4)} ${a.y.toFixed(4)} ${a.z.toFixed(4)} `;
      const fragA = ["0 1", ...selectedAtomsA.map(formatAtom)].join("\n");
      const fragB = ["0 1", ...selectedAtomsB.map(formatAtom)].join("\n");
      const moleculeString = `${fragA} \n--\n${fragB} `;

      console.log("Sending molecule string:", moleculeString);

      const response = await fetch(`${apiUrl}/predict-pairwise-energies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ molecule_string: moleculeString })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const energies = data.energies.total; // Use total energy for now
      // energies is [Na][Nb]

      const atomIndices: number[] = [];
      const energyContributions: number[] = [];

      // Color Monomer B based on interaction with A
      selectedAtomsB.forEach((atomB, j) => {
        let energySum = 0;
        for (let i = 0; i < selectedAtomsA.length; i++) {
          // Check bounds
          if (i < energies.length && j < energies[i].length) {
            energySum += energies[i][j];
          }
        }
        atomIndices.push(atomB.originalIndex);
        energyContributions.push(energySum);
      });

      const sourceIndices = selectedAtomsA.map(a => a.originalIndex);

      await applyFsaptColoring(plugin, {
        atom_indices: atomIndices,
        energy_contributions: energyContributions,
        interaction_type: 'total',
        threshold: threshold,
        source_indices: sourceIndices
      });

      showStatus("✅ FSAPT visualization applied!", "success");
    } catch (error) {
      showStatus(
        `❌ FSAPT visualization failed: ${error instanceof Error ? error.message : "Unknown error"
        }`,
        "error",
      );
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiTest = async () => {
    showStatus("Testing API health...", "info");
    try {
      const response = await fetch(`${apiUrl}/api/health`);
      const data = await response.json();
      if (response.ok) {
        showStatus(
          `✅ API is healthy! Service: ${data.service} v${data.version}`,
          "success",
        );
      } else {
        showStatus(`❌ API health check failed: ${data.message}`, "error");
      }
    } catch (error) {
      showStatus(
        `❌ Cannot connect to API: ${error instanceof Error ? error.message : "Unknown error"
        }`,
        "error",
      );
    }
  };

  const handleGetPairs = async () => {
    showStatus("Fetching available pairs...", "info");
    try {
      const response = await fetch(`${apiUrl}/api/available-pairs`);
      const data = await response.json();
      if (data.success) {
        showStatus(`✅ Available pairs: ${data.pairs.join(", ")}`, "success");
      } else {
        showStatus(`❌ Failed to get pairs: ${data.message}`, "error");
      }
    } catch (error) {
      showStatus(
        `❌ Error fetching pairs: ${error instanceof Error ? error.message : "Unknown error"
        }`,
        "error",
      );
    }
  };

  const handleGetSummary = async () => {
    if (!ligandId || !proteinId) {
      showStatus("❌ Please enter Ligand ID and Protein ID first", "error");
      return;
    }

    showStatus("Fetching interaction summary...", "info");
    try {
      const response = await fetch(
        `${apiUrl}/api/interaction-summary/${ligandId}/${proteinId}`,
      );
      const data = await response.json();
      if (data.success) {
        const s = data.summary;
        const summary =
          `📊 Summary: ${s.total_interactions} interactions, ${s.attractive_interactions} attractive, ${s.repulsive_interactions} repulsive. Total: ${s.total_energy.toFixed(
            2,
          )
          } kcal/mol`;
        showStatus(summary, "success");
      } else {
        showStatus(`❌ Failed to get summary: ${data.message}`, "error");
      }
    } catch (error) {
      showStatus(
        `❌ Error fetching summary: ${error instanceof Error ? error.message : "Unknown error"
        }`,
        "error",
      );
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "300px",
        height: "100vh",
        background: "#f5f5f5",
        borderRight: "1px solid #ddd",
        padding: "10px",
        boxSizing: "border-box",
        overflowY: "auto",
        fontFamily: "Arial, sans-serif",
        zIndex: 1000,
      }}
    >
      <h2 style={{ fontSize: "16px", marginTop: 0, color: "#333" }}>
        FSAPT Visualization
      </h2>

      {/* Structure Loading */}
      <div style={controlGroupStyle}>
        <h3 style={headerStyle}>🧬 Structure Loading</h3>
        <label style={labelStyle}>Structure URL:</label>
        <input
          style={inputStyle}
          type="text"
          value={structureUrl}
          onChange={(e) => setStructureUrl(e.target.value)}
          disabled={isLoading}
        />
        <label style={labelStyle}>Format:</label>
        <select
          style={inputStyle}
          value={structureFormat}
          onChange={(e) => setStructureFormat(e.target.value)}
          disabled={isLoading}
        >
          <option value="bcif">BCIF (Binary)</option>
          <option value="mmcif">mmCIF</option>
          <option value="pdb">PDB</option>
        </select>
        <button
          style={buttonStyle}
          onClick={handleLoadStructure}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Load Structure"}
        </button>
      </div>

      {/* FSAPT Visualization */}
      <div style={controlGroupStyle}>
        <h3 style={headerStyle}>⚡ FSAPT Visualization</h3>

        <div style={{ marginBottom: '10px' }}>
          <button style={{ ...buttonStyle, backgroundColor: selectedAtomsA.length ? '#d4edda' : '#f8f9fa' }} onClick={() => handleSetMonomer('A')}>
            Set Monomer A (Source) {selectedAtomsA.length > 0 && `(${selectedAtomsA.length})`}
          </button>
          <button style={{ ...buttonStyle, backgroundColor: selectedAtomsB.length ? '#d4edda' : '#f8f9fa' }} onClick={() => handleSetMonomer('B')}>
            Set Monomer B (Target) {selectedAtomsB.length > 0 && `(${selectedAtomsB.length})`}
          </button>
        </div>

        <label style={labelStyle}>API URL:</label>
        <input
          style={inputStyle}
          type="text"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          disabled={isLoading}
        />
        <label style={labelStyle}>Energy Threshold:</label>
        <input
          style={inputStyle}
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          step="0.1"
          min="0"
          max="5"
          disabled={isLoading}
        />
        <button
          style={buttonStyle}
          onClick={handleFsaptVisualization}
          disabled={isLoading}
        >
          {isLoading ? "Applying..." : "Apply FSAPT Coloring"}
        </button>
        <div style={sampleDataStyle}>
          <strong>Instructions:</strong>
          <br />
          1. Select atoms in viewer (Shift+Click/Drag)
          <br />
          2. Click "Set Monomer A"
          <br />
          3. Select other atoms
          <br />
          4. Click "Set Monomer B"
          <br />
          5. Click "Apply FSAPT Coloring"
        </div>
      </div>

      {/* API Testing */}
      <div style={controlGroupStyle}>
        <h3 style={headerStyle}>🔧 API Testing</h3>
        <button
          style={buttonStyle}
          onClick={handleApiTest}
          disabled={isLoading}
        >
          Test API Health
        </button>
        <button
          style={buttonStyle}
          onClick={handleGetPairs}
          disabled={isLoading}
        >
          Get Available Pairs
        </button>
        <button
          style={buttonStyle}
          onClick={handleGetSummary}
          disabled={isLoading}
        >
          Get Summary
        </button>
      </div>

      {/* Legend */}
      <div style={controlGroupStyle}>
        <h3 style={headerStyle}>📊 Legend</h3>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "5px",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              background: "linear-gradient(to right, #87CEEB, #0000FF)",
              marginRight: "8px",
            }}
          >
          </div>
          <span style={{ fontSize: "11px" }}>Attractive (Blue)</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "5px",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              background: "linear-gradient(to right, #FFB6C1, #FF0000)",
              marginRight: "8px",
            }}
          >
          </div>
          <span style={{ fontSize: "11px" }}>Repulsive (Red)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              background: "#888888",
              opacity: 0.3,
              marginRight: "8px",
            }}
          >
          </div>
          <span style={{ fontSize: "11px" }}>Background</span>
        </div>
      </div>

      {/* Status */}
      {
        status && (
          <div
            style={{
              ...statusStyle,
              backgroundColor: status.type === "success"
                ? "#d4edda"
                : status.type === "error"
                  ? "#f8d7da"
                  : "#d1ecf1",
              color: status.type === "success"
                ? "#155724"
                : status.type === "error"
                  ? "#721c24"
                  : "#0c5460",
              borderColor: status.type === "success"
                ? "#c3e6cb"
                : status.type === "error"
                  ? "#f5c6cb"
                  : "#bee5eb",
            }}
          >
            {status.message}
          </div>
        )
      }
    </div >
  );
};

const MolstarViewer: React.FC<{ plugin: PluginUIContext | null }> = ({
  plugin,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: "300px",
        right: 0,
        bottom: 0,
      }}
    >
      {plugin && <Plugin plugin={plugin} />}
    </div>
  );
};

const FsaptVisualizationApp: React.FC = () => {
  const [plugin, setPlugin] = useState<PluginUIContext | null>(null);
  const [initStatus, setInitStatus] = useState<string>("Initializing...");

  useEffect(() => {
    const initPlugin = async () => {
      try {
        const newPlugin = new PluginUIContext(spec);
        await newPlugin.init();
        setPlugin(newPlugin);

        newPlugin.representation.structure.themes.colorThemeRegistry.add(
          CustomPerAtomColorThemeProvider,
        );
        // Load default structure
        const s = await loadStructure(newPlugin, "http://localhost:5173/default.xyz", {
          isBinary: false,
          format: 'xyz'
        });

        setInitStatus("loaded");
      } catch (error) {
        console.error("Failed to initialize plugin:", error);
        setInitStatus("Failed to initialize");
      }
    };

    initPlugin();
  }, []);

  if (initStatus !== "Ready") {
    return (
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "18px",
          color: "#666",
        }}
      >
        {initStatus}
      </div>
    );
  }

  return (
    <>
      <ControlPanel plugin={plugin} />
      <MolstarViewer plugin={plugin} />
    </>
  );
};

// Styles
const controlGroupStyle: React.CSSProperties = {
  marginBottom: "20px",
  padding: "15px",
  background: "white",
  borderRadius: "5px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
};

const headerStyle: React.CSSProperties = {
  marginTop: 0,
  color: "#333",
  fontSize: "14px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "bold",
  fontSize: "12px",
  color: "black",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px",
  marginBottom: "10px",
  border: "1px solid #ddd",
  borderRadius: "3px",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  background: "#007bff",
  color: "white",
  border: "none",
  borderRadius: "3px",
  cursor: "pointer",
  fontSize: "12px",
  marginBottom: "5px",
};

const sampleDataStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#666",
  marginTop: "10px",
};

const statusStyle: React.CSSProperties = {
  padding: "10px",
  borderRadius: "3px",
  marginTop: "10px",
  fontSize: "12px",
  border: "1px solid",
};

export default FsaptVisualizationApp;

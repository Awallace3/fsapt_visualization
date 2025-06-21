import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Plugin } from "molstar/lib/mol-plugin-ui/plugin";
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms";
import { Structure } from "molstar/lib/mol-model/structure";
import {
  PluginStateObject as PSO,
  PluginStateTransform,
} from "molstar/lib/mol-plugin-state/objects";
import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { renderReact18 } from "molstar/lib/mol-plugin-ui/react18";
import { type PluginLayoutControlsDisplay } from "molstar/lib/mol-plugin/layout";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import {
  DefaultPluginUISpec,
  type PluginUISpec,
} from "molstar/lib/mol-plugin-ui/spec";
import { PluginBehaviors } from "molstar/lib/mol-plugin/behavior";
import { PluginCommands } from "molstar/lib/mol-plugin/commands";
import { PluginConfig } from "molstar/lib/mol-plugin/config";
import { PluginSpec } from "molstar/lib/mol-plugin/spec";
import { StateObject } from "molstar/lib/mol-state";
import { Task } from "molstar/lib/mol-task";
import { ColorNames } from "molstar/lib/mol-util/color/names";
import { AtomIdColorTheme } from "molstar/lib/mol-theme/color/atom-id";
import { ParamDefinition as PD } from "molstar/lib/mol-util/param-definition";
import { ColorTheme } from 'molstar/lib/mol-theme/color';
import "molstar/lib/mol-util/polyfill";
import { ObjectKeys } from "molstar/lib/mol-util/type-helpers";
import { StructureFocusRepresentation } from 'molstar/lib/mol-plugin/behavior/dynamic/selection/structure-focus-representation';
// import ViewportComponent from "./viewport.tsx";

interface FsaptData {
  atom_indices: number[];
  energy_contributions: number[];
  interaction_type: string;
  threshold?: number;
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
        PluginSpec.Behavior(StructureFocusRepresentation),

        PluginSpec.Behavior(PluginBehaviors.Representation.HighlightLoci),
        PluginSpec.Behavior(PluginBehaviors.Representation.SelectLoci),
        PluginSpec.Behavior(PluginBehaviors.Representation.DefaultLociLabelProvider),
        PluginSpec.Behavior(PluginBehaviors.Representation.FocusLoci),
        PluginSpec.Behavior(PluginBehaviors.Camera.FocusLoci),
        PluginSpec.Behavior(PluginBehaviors.Camera.CameraAxisHelper),
        PluginSpec.Behavior(PluginBehaviors.Camera.CameraControls),
        PluginSpec.Behavior(PluginBehaviors.CustomProps.StructureInfo),
        PluginSpec.Behavior(PluginBehaviors.CustomProps.AccessibleSurfaceArea),
        PluginSpec.Behavior(PluginBehaviors.CustomProps.BestDatabaseSequenceMapping),
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
    [PluginConfig.State.DefaultServer, true],
    [PluginConfig.State.CurrentServer, true],
    [PluginConfig.VolumeStreaming.DefaultServer, true],
    [PluginConfig.Download.DefaultPdbProvider, true],
    [PluginConfig.Download.DefaultEmdbProvider, true],
  ],
};
console.log("Plugin spec:", spec);

export async function loadStructure(
  plugin: PluginUIContext,
  url: string,
  options?: { format?: string; isBinary?: boolean },
) {
  const data = await plugin.builders.data.download({
    url,
    isBinary: options?.isBinary,
  });
  const trajectory = await plugin.builders.structure.parseTrajectory(
    data,
    options?.format ?? ("mmcif" as any),
  );
  console.log(trajectory);
  const structure = await plugin.builders.structure.hierarchy.applyPreset(
    trajectory,
    "default",
  );
  return structure;
}
export async function applyFsaptColoring(
  plugin: PluginUIContext,
  fsaptData: FsaptData,
) {
  // try {
  // Get the structure
  const structures = plugin.managers.structure.hierarchy.current.structures;
  if (structures.length === 0) {
    throw new Error("No structure loaded");
  }

  console.log("FSAPT Data received:", fsaptData);
  console.log("Atom indices:", fsaptData.atom_indices);
  console.log("Energy contributions:", fsaptData.energy_contributions);

  // Calculate some basic statistics
  const totalEnergy = fsaptData.energy_contributions.reduce(
    (sum, energy) => sum + energy,
    0,
  );
  const attractiveCount = fsaptData.energy_contributions.filter(
    (e) => e < 0,
  ).length;
  const repulsiveCount = fsaptData.energy_contributions.filter(
    (e) => e > 0,
  ).length;

  console.log(`Total energy: ${totalEnergy.toFixed(2)} kcal/mol`);
  console.log(`Attractive interactions: ${attractiveCount}`);
  console.log(`Repulsive interactions: ${repulsiveCount}`);
}

interface ControlPanelProps {
  plugin: PluginUIContext | null;
}

interface StatusMessage {
  message: string;
  type: "success" | "error" | "info";
}


function logStructureData(
  plugin: PluginUIContext,
) {
  console.log('logStructureData()');
  const componentManager = plugin.managers.structure.component;
  for (const structure of componentManager.currentStructures) {
    if (!structure.properties) {
        continue;
    }
    const cell = plugin.state.data.select(structure.properties.cell.transform.ref)[0];
    if (!cell || !cell.obj) {
      continue;
    }
    const structureData = (cell.obj as PSO.Molecule.Structure).data;
    for (const component of structure.components) {
      if (!component.cell.obj) {
        continue;
      }
      // For each component in each structure, display the content of the selection
      Structure.eachAtomicHierarchyElement(component.cell.obj.data, {
        atom: location => console.log(location.element)
      });
      for (const rep of component.representations) {
        // For each representation of the component, display its type
        console.log(rep.cell?.transform?.params?.type?.name)

        // Also display the color for each atom
        const colorThemeName = rep.cell.transform.params?.colorTheme.name;
        const colorThemeParams = rep.cell.transform.params?.colorTheme.params;
        const theme = plugin.representation.structure.themes.colorThemeRegistry.create(
          colorThemeName || '',
          { structure: structureData },
          colorThemeParams
        ) as ColorTheme<typeof colorThemeParams>;
        Structure.eachAtomicHierarchyElement(component.cell.obj.data, {
          atom: loc => console.log(theme.color(loc, false))
        });
      }
    }
  }
}

const ControlPanel: React.FC<ControlPanelProps> = ({ plugin }) => {
  const [structureUrl, setStructureUrl] = useState(
    "https://files.rcsb.org/download/3ACX.pdb",
  );
  const [structureFormat, setStructureFormat] = useState("pdb");
  const [ligandId, setLigandId] = useState("LIG");
  const [proteinId, setProteinId] = useState("PROT_001");
  const [apiUrl, setApiUrl] = useState("http://localhost:5000");
  const [threshold, setThreshold] = useState(0.5);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const structRef = useRef<Structure | undefined>(undefined);

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
      structRef.current = await loadStructure(plugin, structureUrl, {
        format: structureFormat,
        isBinary,
      });
      showStatus("✅ Structure loaded successfully!", "success");
    } catch (error) {
      showStatus(
        `❌ Error loading structure: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };
  console.log("Loaded structure:", structRef.current);
    if (plugin && structRef.current) {
      logStructureData(plugin);
  }


  const handleFsaptVisualization = async () => {
    if (!plugin) {
      showStatus("❌ Plugin not initialized", "error");
      return;
    }

    if (!ligandId || !proteinId) {
      showStatus("❌ Please enter both Ligand ID and Protein ID", "error");
      return;
    }

    setIsLoading(true);
    showStatus("🔄 Fetching FSAPT data and applying visualization...", "info");

    try {
      const fsaptData = await visualizeFsaptInteractions(
        plugin,
        ligandId,
        proteinId,
        apiUrl,
      );
      const summary = `✅ FSAPT visualization applied! Found ${fsaptData.atom_indices.length} significant interactions`;
      showStatus(summary, "success");
    } catch (error) {
      showStatus(
        `❌ FSAPT visualization failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error",
      );
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
        `❌ Cannot connect to API: ${
          error instanceof Error ? error.message : "Unknown error"
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
        `❌ Error fetching pairs: ${
          error instanceof Error ? error.message : "Unknown error"
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
        const summary = `📊 Summary: ${s.total_interactions} interactions, ${s.attractive_interactions} attractive, ${s.repulsive_interactions} repulsive. Total: ${s.total_energy.toFixed(
          2,
        )} kcal/mol`;
        showStatus(summary, "success");
      } else {
        showStatus(`❌ Failed to get summary: ${data.message}`, "error");
      }
    } catch (error) {
      showStatus(
        `❌ Error fetching summary: ${
          error instanceof Error ? error.message : "Unknown error"
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
        <label style={labelStyle}>Ligand ID:</label>
        <input
          style={inputStyle}
          type="text"
          value={ligandId}
          onChange={(e) => setLigandId(e.target.value)}
          placeholder="e.g., LIG, ATP, GDP"
          disabled={isLoading}
        />
        <label style={labelStyle}>Protein ID:</label>
        <input
          style={inputStyle}
          type="text"
          value={proteinId}
          onChange={(e) => setProteinId(e.target.value)}
          placeholder="e.g., PROT_001, ENZYME"
          disabled={isLoading}
        />
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
          <strong>Sample pairs available:</strong>
          <br />
          • LIG + PROT_001
          <br />
          • LIG + PROT_002
          <br />
          <em>Or try any IDs for mock data</em>
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
          ></div>
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
          ></div>
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
          ></div>
          <span style={{ fontSize: "11px" }}>Background</span>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div
          style={{
            ...statusStyle,
            backgroundColor:
              status.type === "success"
                ? "#d4edda"
                : status.type === "error"
                  ? "#f8d7da"
                  : "#d1ecf1",
            color:
              status.type === "success"
                ? "#155724"
                : status.type === "error"
                  ? "#721c24"
                  : "#0c5460",
            borderColor:
              status.type === "success"
                ? "#c3e6cb"
                : status.type === "error"
                  ? "#f5c6cb"
                  : "#bee5eb",
          }}
        >
          {status.message}
        </div>
      )}
    </div>
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

        // Load default structure
        await loadStructure(newPlugin, "https://models.rcsb.org/4hhb.bcif", {
          isBinary: true,
        });
        setInitStatus("Ready");
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

// Export functions for external use
export { FsaptVisualizationApp };

// // Initialize the app
// export async function initFsaptApp(element: string | HTMLDivElement) {
//     const parent = typeof element === 'string' ? document.getElementById(element)! as HTMLDivElement : element;
//     createRoot(parent).render(<FsaptVisualizationApp />);
// }

export default FsaptVisualizationApp;

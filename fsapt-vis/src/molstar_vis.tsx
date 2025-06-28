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
import { AtomIdColorThemeProvider, AtomIdColorTheme  } from "molstar/src/mol-theme/color/atom-id"

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
  const data = await ctx.builders.data.download({
    url,
    isBinary: options?.isBinary,
  });
  const trajectory = await ctx.builders.structure.parseTrajectory(
    data,
    options?.format ?? ("mmcif" as any),
  );
  const structure = await ctx.builders.structure.hierarchy.applyPreset(
    trajectory,
    "default",
  );

  // testing
  // Get polymer representation
  const polymer = structure?.representation.representations.polymer;
  const ligand = structure?.representation.representations.ligand;

  // Create and apply custom representation
  const reprParamsStructureResetColor = createStructureRepresentationParams(
    ctx,
    undefined,
    {
      type: "backbone",
      color: "uniform",
      colorParams: { value: ColorNames.gray },
    },
  );

  const reprParamsResetColor = createStructureRepresentationParams(
    ctx,
    undefined,
    {
      type: "ball-and-stick",
      color: "uniform",
      colorParams: { value: ColorNames.aqua },
    },
  );

  const structData = ctx.managers.structure.hierarchy.selection.structures[0]
    ?.components[0]?.cell.obj?.data;
  if (!structData) {
    return structure;
  }

  const atomIndices: number[] = [];
  const atomColors: Color[] = [];
  for (let i = 0; i < structData.elementCount; i++) {
    atomIndices.push(i);
    if (i % 2 === 0) {
      atomColors.push(ColorNames.red);
    } else {
      atomColors.push(ColorNames.yellow);
    }
  }

  const fsaptTheme: PD.Values<CustomAtomColorThemeParams> = {
    indices: atomIndices,
    colors: atomColors,
  };

  const polymerReprParams = createStructureRepresentationParams(
    ctx,
    undefined,
    {
      type: "backbone",
      color: CustomPerAtomColorThemeProvider.name,
      colorParams: fsaptTheme,
    },
  );

  const ligandReprParams = createStructureRepresentationParams(
    ctx,
    undefined,
    {
      type: "ball-and-stick",
      color: CustomPerAtomColorThemeProvider.name,
      colorParams: fsaptTheme,
    },
  );

  const polymerUpdate = ctx.build().to(polymer).update(polymerReprParams);
  const ligandUpdate = ctx.build().to(ligand).update(ligandReprParams);

  await polymerUpdate.commit();
  await ligandUpdate.commit();

  // Verify colorTheme
  const componentManager = ctx.managers.structure.component;
  console.log('componentManager:', componentManager );
  for (const structure of componentManager.currentStructures) {
  if (!structure.properties) {
      continue;
  }
  const cell = ctx.state.data.select(structure.properties.cell.transform.ref)[0];
  if (!cell || !cell.obj) {
    continue;
  }
  const structureData = (cell.obj as PSO.Molecule.Structure).data;
  for (const component of structure.components) {
    if (!component.cell.obj) {
      continue;
    }
    for (const rep of component.representations) {
      // Also display the color for each atom
      const colorThemeName = rep.cell.transform.params?.colorTheme.name;
        console.log(rep.cell?.transform?.params?.type?.name, ' colorThemeName:', colorThemeName);
      const colorThemeParams = rep.cell.transform.params?.colorTheme.params;
      const theme = ctx.representation.structure.themes.colorThemeRegistry.create(
        colorThemeName || '',
        { structure: structureData },
        colorThemeParams
      ) as ColorTheme<typeof colorThemeParams>;
        console.log('theme:', theme);
      // Structure.eachAtomicHierarchyElement(component.cell.obj.data, {
      //   atom: loc => console.log(theme.color(loc, false))
      // });
    }
  }
}


  return structure;
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
      // Get polymer representation
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

    if (!ligandId || !proteinId) {
      showStatus("❌ Please enter both Ligand ID and Protein ID", "error");
      return;
    }

    setIsLoading(true);
    showStatus("🔄 Fetching FSAPT data and applying visualization...", "info");

    try {
      // const fsaptData = await visualizeFsaptInteractions(
      //   plugin,
      //   ligandId,
      //   proteinId,
      //   apiUrl,
      // );
      const summary = `✅ FSAPT visualization applied!`;
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
        const summary =
          `📊 Summary: ${s.total_interactions} interactions, ${s.attractive_interactions} attractive, ${s.repulsive_interactions} repulsive. Total: ${
            s.total_energy.toFixed(
              2,
            )
          } kcal/mol`;
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
      {status && (
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

        newPlugin.representation.structure.themes.colorThemeRegistry.add(
          CustomPerAtomColorThemeProvider,
        );
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

export default FsaptVisualizationApp;

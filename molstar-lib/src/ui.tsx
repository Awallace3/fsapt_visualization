import React from "react";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  DefaultPluginUISpec,
  PluginUISpec,
} from "molstar/lib/mol-plugin-ui/spec";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { Plugin } from "molstar/lib/mol-plugin-ui/plugin";
import { Color } from "molstar/lib/mol-util/color";
import { StructureElement } from "molstar/lib/mol-model/structure";
import { Script } from "molstar/lib/mol-script/script";
import { MolScriptBuilder as MS } from "molstar/lib/mol-script/language/builder";
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms";
import { PluginStateObject } from "molstar/lib/mol-plugin-state/objects";
import { StructureSelection } from "molstar/lib/mol-model/structure";
import { Bundle } from "molstar/lib/mol-model/structure/structure/element/bundle";
import { ParamDefinition as PD } from "molstar/lib/mol-util/param-definition";
import { StructureSelectionQueries } from "molstar/lib/mol-plugin-state/helpers/structure-selection-query";
import { ColorNames } from "molstar/lib/mol-util/color/names";
import { ColorTheme } from "molstar/lib/mol-theme/color";
import { ThemeDataContext } from "molstar/lib/mol-theme/theme";
import { Location } from "molstar/lib/mol-model/location";
import { StructureSelection } from "molstar/lib/mol-model/structure";
import { Bundle } from "molstar/lib/mol-model/structure/structure/element/bundle";
interface FsaptData {
  atom_indices: number[];
  energy_contributions: number[];
  interaction_type: string;
  threshold?: number;
}

interface FsaptResponse {
  success: boolean;
  data: FsaptData;
  message?: string;
}

export async function initViewerUI(
  element: string | HTMLDivElement,
  options?: { spec?: PluginUISpec },
) {
  const parent = typeof element === "string";
    ? (document.getElementById(element)! as HTMLDivElement)
    : element;
  const spec = { ...DefaultPluginUISpec(), ...options?.spec };
  const plugin = new PluginUIContext(spec);
  await plugin.init();

  createRoot(parent).render(<Plugin plugin={plugin} />);

  return plugin;
}

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
    options?.format ?? ("pdb" as any),
  );
  const structure = await plugin.builders.structure.hierarchy.applyPreset(
    trajectory,
    "default",
  );
  return structure;
}

export async function fetchFsaptData(
  ligandId: string,
  proteinId: string,
  apiUrl: string = "http://localhost:5000",
): Promise<FsaptResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/fsapt-analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ligand_id: ligandId,
        protein_id: proteinId,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching fsapt data:", error);
    return {
      success: false,
      data: {
        atom_indices: [],
        energy_contributions: [],
        interaction_type: "unknown",
      },
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function createFsaptColorTheme(
  fsaptData: FsaptData,
): ColorTheme.Provider<any, any> {
  const energyMap = new Map<number, number>();
  const { atom_indices, energy_contributions } = fsaptData;

  // Create mapping from atom indices to energy values
  for (let i = 0; i < atom_indices.length; i++) {
    energyMap.set(atom_indices[i], energy_contributions[i]);
  }

  // Calculate energy range for color scaling
  const minEnergy = Math.min(...energy_contributions);
  const maxEnergy = Math.max(...energy_contributions);
  const energyRange = Math.max(Math.abs(minEnergy), Math.abs(maxEnergy));

  function getEnergyColor(energy: number): Color {
    if (Math.abs(energy) < 0.05) {
      // Neutral/weak interactions - light gray
      return ColorNames.lightgray;
    }

    if (energy < 0) {
      // Attractive interactions - blue gradient
      const intensity = Math.min(Math.abs(energy) / energyRange, 1.0);
      if (intensity < 0.3) return Color.fromRgb(173, 216, 230); // Light blue
      if (intensity < 0.6) return Color.fromRgb(100, 149, 237); // Cornflower blue
      return Color.fromRgb(0, 0, 255); // Pure blue for strong attractive
    } else {
      // Repulsive interactions - red gradient
      const intensity = Math.min(energy / energyRange, 1.0);
      if (intensity < 0.3) return Color.fromRgb(255, 182, 193); // Light pink
      if (intensity < 0.6) return Color.fromRgb(255, 99, 71); // Tomato
      return Color.fromRgb(255, 0, 0); // Pure red for strong repulsive
    }
  }

  // const FsaptColorTheme = ColorTheme.factory({
  //   name: 'fsapt-interaction',
  //   label: 'FSAPT Interaction',
  //   category: ColorTheme.Category.Atom,
  //   factory: (ctx: ThemeDataContext, props: any) => {
  //     return {
  //       factory: FsaptColorTheme,
  //       granularity: 'group',
  //       color: (location: Location): Color => {
  //         if (StructureElement.Location.is(location)) {
  //           const atomIndex = StructureElement.Location.atomIndex(location);
  //           if (energyMap.has(atomIndex)) {
  //             const energy = energyMap.get(atomIndex)!;
  //             return getEnergyColor(energy);
  //           }
  //         }
  //         // Default color for atoms without FSAPT data
  //         return Color.fromRgb(128, 128, 128); // Gray
  //       },
  //       props: props,
  //       description: 'Colors atoms based on FSAPT interaction energies'
  //     };
  //   },
  //   getParams: () => ({}),
  //   defaultValues: {},
  //   isApplicable: () => true
  // });
  // return FsaptColorTheme;
  return {};
}

// Simplified approach: Apply coloring by creating selections and colored representations
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

  // Create and register the custom color theme
  const fsaptTheme = createFsaptColorTheme(fsaptData);
  plugin.representation.structure.themes.colorThemeRegistry.add(fsaptTheme);

  // Apply the custom color theme to all structure representations
  const update = plugin.state.data.build();

  for (const structure of structures) {
    const representations =
      plugin.managers.structure.hierarchy.current.structures.find(
        (s) => s.cell.obj === structure.cell.obj,
      )?.representations || [];

    for (const repr of representations) {
      if (
        repr.cell.obj &&
        repr.cell.params &&
        repr.cell.params.type &&
        repr.cell.params.type.name === "ball-and-stick"
      ) {
        update
          .to(repr.cell)
          .update(
            StateTransforms.Representation.StructureRepresentation3D,
            (old) => ({
              ...old,
              colorTheme: { name: "fsapt-interaction", params: {} },
            }),
          );
      }
    }
  }

  await update.commit();

  console.log(
    `FSAPT visualization applied - processed ${fsaptData.atom_indices.length} interactions`,
  );

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
    const summary =
      `✅ FSAPT visualization applied! Found ${fsaptData.atom_indices.length} significant interactions`;
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
  // };
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
      await loadStructure(plugin, structureUrl, {
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
      const summary =
        `✅ FSAPT visualization applied! Found ${fsaptData.atom_indices.length} significant interactions`;
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
            s.total_energy.toFixed(2)
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
          style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}
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
          style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}
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
        // position: "absolute",
        // top: 0,
        // left: "300px",
        // right: 0,
        // bottom: 0,
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
        const spec = { ...DefaultPluginUISpec() };
        const newPlugin = new PluginUIContext(spec);
        await newPlugin.init();
        setPlugin(newPlugin);

        // Load default structure
        await loadStructure(
          newPlugin,
          // 'https://models.rcsb.org/4hhb.bcif',
          "https://files.rcsb.org/download/3ACX.pdb",
          { isBinary: true },
        );
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
  color: "#555",
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

// Initialize the app
export async function initFsaptApp(element: string | HTMLDivElement) {
  const parent = typeof element === "string"
    ? (document.getElementById(element)! as HTMLDivElement)
    : element;
  createRoot(parent).render(<FsaptVisualizationApp />);
}
export async function visualizeFsaptInteractions(
  plugin: PluginUIContext,
  ligandId: string,
  proteinId: string,
  apiUrl?: string,
) {
  try {
    // Fetch fsapt data from API
    const response = await fetchFsaptData(ligandId, proteinId, apiUrl);

    if (!response.success) {
      throw new Error(response.message || "Failed to fetch fsapt data");
    }

    // Apply coloring based on fsapt data
    await applyFsaptColoring(plugin, response.data);

    console.log("Fsapt visualization applied successfully");
    return response.data;
  } catch (error) {
    console.error("Error in fsapt visualization:", error);
    throw error;
  }
}

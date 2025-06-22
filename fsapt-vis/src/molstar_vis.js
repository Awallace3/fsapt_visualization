import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useRef } from "react";
import { Plugin } from "molstar/lib/mol-plugin-ui/plugin";
import { Structure } from "molstar/lib/mol-model/structure";
// import {
//   PluginStateObject as PSO,
//   // PluginStateTransform,
// } from "molstar/lib/mol-plugin-state/objects";
import {} from "molstar/lib/mol-plugin/layout";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { DefaultPluginUISpec, } from "molstar/lib/mol-plugin-ui/spec";
import { PluginBehaviors } from "molstar/lib/mol-plugin/behavior";
import { PluginConfig } from "molstar/lib/mol-plugin/config";
import { PluginSpec } from "molstar/lib/mol-plugin/spec";
import "molstar/lib/mol-util/polyfill";
import { ObjectKeys } from "molstar/lib/mol-util/type-helpers";
import { StructureFocusRepresentation } from 'molstar/lib/mol-plugin/behavior/dynamic/selection/structure-focus-representation';
import { CustomPerAtomColorThemeProvider } from './fsaptColorTheme.tsx';
const DefaultViewerOptions = {
    extensions: ObjectKeys({}),
    layoutControlsDisplay: "reactive",
    viewportShowExpand: PluginConfig.Viewport.ShowExpand.defaultValue,
    viewportShowControls: PluginConfig.Viewport.ShowControls.defaultValue,
    viewportShowSettings: PluginConfig.Viewport.ShowSettings.defaultValue,
    viewportShowSelectionMode: PluginConfig.Viewport.ShowSelectionMode.defaultValue,
    viewportShowAnimation: PluginConfig.Viewport.ShowAnimation.defaultValue,
    pluginStateServer: PluginConfig.State.DefaultServer.defaultValue,
    volumeStreamingServer: PluginConfig.VolumeStreaming.DefaultServer.defaultValue,
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
const spec = {
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
        [PluginConfig.Viewport.ShowTrajectoryControls, true],
        [PluginConfig.Viewport.ShowScreenshotControls, true],
        [PluginConfig.State.DefaultServer, true],
        [PluginConfig.State.CurrentServer, true],
        [PluginConfig.VolumeStreaming.DefaultServer, true],
        [PluginConfig.Download.DefaultPdbProvider, true],
        [PluginConfig.Download.DefaultEmdbProvider, true],
    ],
};
console.log("Plugin spec:", spec);
export async function loadStructure(plugin, url, options) {
    const data = await plugin.builders.data.download({
        url,
        isBinary: options?.isBinary,
    });
    const trajectory = await plugin.builders.structure.parseTrajectory(data, options?.format ?? "mmcif");
    console.log(trajectory);
    const structure = await plugin.builders.structure.hierarchy.applyPreset(trajectory, "default");
    return structure;
}
export async function applyFsaptColoring(plugin, fsaptData) {
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
    const totalEnergy = fsaptData.energy_contributions.reduce((sum, energy) => sum + energy, 0);
    const attractiveCount = fsaptData.energy_contributions.filter((e) => e < 0).length;
    const repulsiveCount = fsaptData.energy_contributions.filter((e) => e > 0).length;
    console.log(`Total energy: ${totalEnergy.toFixed(2)} kcal/mol`);
    console.log(`Attractive interactions: ${attractiveCount}`);
    console.log(`Repulsive interactions: ${repulsiveCount}`);
}
// function logStructureData(
//   plugin: PluginUIContext,
// ) {
//   console.log('logStructureData()');
//   const componentManager = plugin.managers.structure.component;
//   for (const structure of componentManager.currentStructures) {
//     if (!structure.properties) {
//         continue;
//     }
//     const cell = plugin.state.data.select(structure.properties.cell.transform.ref)[0];
//     if (!cell || !cell.obj) {
//       continue;
//     }
//     const structureData = (cell.obj as PSO.Molecule.Structure).data;
//     for (const component of structure.components) {
//       if (!component.cell.obj) {
//         continue;
//       }
//       // For each component in each structure, display the content of the selection
//       Structure.eachAtomicHierarchyElement(component.cell.obj.data, {
//         atom: location => console.log(location.element)
//       });
//       for (const rep of component.representations) {
//         // For each representation of the component, display its type
//         console.log(rep.cell?.transform?.params?.type?.name)
//
//         // Also display the color for each atom
//         const colorThemeName = rep.cell.transform.params?.colorTheme.name;
//         const colorThemeParams = rep.cell.transform.params?.colorTheme.params;
//         const theme = plugin.representation.structure.themes.colorThemeRegistry.create(
//           colorThemeName || '',
//           { structure: structureData },
//           colorThemeParams
//         ) as ColorTheme<typeof colorThemeParams>;
//         Structure.eachAtomicHierarchyElement(component.cell.obj.data, {
//           atom: loc => console.log(theme.color(loc, false))
//         });
//       }
//     }
//   }
// }
const ControlPanel = ({ plugin }) => {
    const [structureUrl, setStructureUrl] = useState("https://files.rcsb.org/download/3ACX.pdb");
    const [structureFormat, setStructureFormat] = useState("pdb");
    const [ligandId, setLigandId] = useState("LIG");
    const [proteinId, setProteinId] = useState("PROT_001");
    const [apiUrl, setApiUrl] = useState("http://localhost:5000");
    const [threshold, setThreshold] = useState(0.5);
    const [status, setStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const structRef = useRef(undefined);
    const showStatus = (message, type) => {
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
        }
        catch (error) {
            showStatus(`❌ Error loading structure: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
        }
        finally {
            setIsLoading(false);
        }
    };
    console.log("Loaded structure:", structRef.current);
    //   if (plugin && structRef.current) {
    //     logStructureData(plugin);
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
            plugin.representation.structure.themes.colorThemeRegistry.add(CustomPerAtomColorThemeProvider);
            const summary = `✅ FSAPT visualization applied!`;
            showStatus(summary, "success");
        }
        catch (error) {
            showStatus(`❌ FSAPT visualization failed: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleApiTest = async () => {
        showStatus("Testing API health...", "info");
        try {
            const response = await fetch(`${apiUrl}/api/health`);
            const data = await response.json();
            if (response.ok) {
                showStatus(`✅ API is healthy! Service: ${data.service} v${data.version}`, "success");
            }
            else {
                showStatus(`❌ API health check failed: ${data.message}`, "error");
            }
        }
        catch (error) {
            showStatus(`❌ Cannot connect to API: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
        }
    };
    const handleGetPairs = async () => {
        showStatus("Fetching available pairs...", "info");
        try {
            const response = await fetch(`${apiUrl}/api/available-pairs`);
            const data = await response.json();
            if (data.success) {
                showStatus(`✅ Available pairs: ${data.pairs.join(", ")}`, "success");
            }
            else {
                showStatus(`❌ Failed to get pairs: ${data.message}`, "error");
            }
        }
        catch (error) {
            showStatus(`❌ Error fetching pairs: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
        }
    };
    const handleGetSummary = async () => {
        if (!ligandId || !proteinId) {
            showStatus("❌ Please enter Ligand ID and Protein ID first", "error");
            return;
        }
        showStatus("Fetching interaction summary...", "info");
        try {
            const response = await fetch(`${apiUrl}/api/interaction-summary/${ligandId}/${proteinId}`);
            const data = await response.json();
            if (data.success) {
                const s = data.summary;
                const summary = `📊 Summary: ${s.total_interactions} interactions, ${s.attractive_interactions} attractive, ${s.repulsive_interactions} repulsive. Total: ${s.total_energy.toFixed(2)} kcal/mol`;
                showStatus(summary, "success");
            }
            else {
                showStatus(`❌ Failed to get summary: ${data.message}`, "error");
            }
        }
        catch (error) {
            showStatus(`❌ Error fetching summary: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
        }
    };
    return (_jsxs("div", { style: {
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
        }, children: [_jsx("h2", { style: { fontSize: "16px", marginTop: 0, color: "#333" }, children: "FSAPT Visualization" }), _jsxs("div", { style: controlGroupStyle, children: [_jsx("h3", { style: headerStyle, children: "\uD83E\uDDEC Structure Loading" }), _jsx("label", { style: labelStyle, children: "Structure URL:" }), _jsx("input", { style: inputStyle, type: "text", value: structureUrl, onChange: (e) => setStructureUrl(e.target.value), disabled: isLoading }), _jsx("label", { style: labelStyle, children: "Format:" }), _jsxs("select", { style: inputStyle, value: structureFormat, onChange: (e) => setStructureFormat(e.target.value), disabled: isLoading, children: [_jsx("option", { value: "bcif", children: "BCIF (Binary)" }), _jsx("option", { value: "mmcif", children: "mmCIF" }), _jsx("option", { value: "pdb", children: "PDB" })] }), _jsx("button", { style: buttonStyle, onClick: handleLoadStructure, disabled: isLoading, children: isLoading ? "Loading..." : "Load Structure" })] }), _jsxs("div", { style: controlGroupStyle, children: [_jsx("h3", { style: headerStyle, children: "\u26A1 FSAPT Visualization" }), _jsx("label", { style: labelStyle, children: "Ligand ID:" }), _jsx("input", { style: inputStyle, type: "text", value: ligandId, onChange: (e) => setLigandId(e.target.value), placeholder: "e.g., LIG, ATP, GDP", disabled: isLoading }), _jsx("label", { style: labelStyle, children: "Protein ID:" }), _jsx("input", { style: inputStyle, type: "text", value: proteinId, onChange: (e) => setProteinId(e.target.value), placeholder: "e.g., PROT_001, ENZYME", disabled: isLoading }), _jsx("label", { style: labelStyle, children: "API URL:" }), _jsx("input", { style: inputStyle, type: "text", value: apiUrl, onChange: (e) => setApiUrl(e.target.value), disabled: isLoading }), _jsx("label", { style: labelStyle, children: "Energy Threshold:" }), _jsx("input", { style: inputStyle, type: "number", value: threshold, onChange: (e) => setThreshold(Number(e.target.value)), step: "0.1", min: "0", max: "5", disabled: isLoading }), _jsx("button", { style: buttonStyle, onClick: handleFsaptVisualization, disabled: isLoading, children: isLoading ? "Applying..." : "Apply FSAPT Coloring" }), _jsxs("div", { style: sampleDataStyle, children: [_jsx("strong", { children: "Sample pairs available:" }), _jsx("br", {}), "\u2022 LIG + PROT_001", _jsx("br", {}), "\u2022 LIG + PROT_002", _jsx("br", {}), _jsx("em", { children: "Or try any IDs for mock data" })] })] }), _jsxs("div", { style: controlGroupStyle, children: [_jsx("h3", { style: headerStyle, children: "\uD83D\uDD27 API Testing" }), _jsx("button", { style: buttonStyle, onClick: handleApiTest, disabled: isLoading, children: "Test API Health" }), _jsx("button", { style: buttonStyle, onClick: handleGetPairs, disabled: isLoading, children: "Get Available Pairs" }), _jsx("button", { style: buttonStyle, onClick: handleGetSummary, disabled: isLoading, children: "Get Summary" })] }), _jsxs("div", { style: controlGroupStyle, children: [_jsx("h3", { style: headerStyle, children: "\uD83D\uDCCA Legend" }), _jsxs("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "5px",
                        }, children: [_jsx("div", { style: {
                                    width: "20px",
                                    height: "20px",
                                    background: "linear-gradient(to right, #87CEEB, #0000FF)",
                                    marginRight: "8px",
                                } }), _jsx("span", { style: { fontSize: "11px" }, children: "Attractive (Blue)" })] }), _jsxs("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "5px",
                        }, children: [_jsx("div", { style: {
                                    width: "20px",
                                    height: "20px",
                                    background: "linear-gradient(to right, #FFB6C1, #FF0000)",
                                    marginRight: "8px",
                                } }), _jsx("span", { style: { fontSize: "11px" }, children: "Repulsive (Red)" })] }), _jsxs("div", { style: { display: "flex", alignItems: "center" }, children: [_jsx("div", { style: {
                                    width: "20px",
                                    height: "20px",
                                    background: "#888888",
                                    opacity: 0.3,
                                    marginRight: "8px",
                                } }), _jsx("span", { style: { fontSize: "11px" }, children: "Background" })] })] }), status && (_jsx("div", { style: {
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
                }, children: status.message }))] }));
};
const MolstarViewer = ({ plugin, }) => {
    return (_jsx("div", { style: {
            position: "absolute",
            top: 0,
            left: "300px",
            right: 0,
            bottom: 0,
        }, children: plugin && _jsx(Plugin, { plugin: plugin }) }));
};
const FsaptVisualizationApp = () => {
    const [plugin, setPlugin] = useState(null);
    const [initStatus, setInitStatus] = useState("Initializing...");
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
            }
            catch (error) {
                console.error("Failed to initialize plugin:", error);
                setInitStatus("Failed to initialize");
            }
        };
        initPlugin();
    }, []);
    if (initStatus !== "Ready") {
        return (_jsx("div", { style: {
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: "18px",
                color: "#666",
            }, children: initStatus }));
    }
    return (_jsxs(_Fragment, { children: [_jsx(ControlPanel, { plugin: plugin }), _jsx(MolstarViewer, { plugin: plugin })] }));
};
// Styles
const controlGroupStyle = {
    marginBottom: "20px",
    padding: "15px",
    background: "white",
    borderRadius: "5px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
};
const headerStyle = {
    marginTop: 0,
    color: "#333",
    fontSize: "14px",
};
const labelStyle = {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
    fontSize: "12px",
    color: "black",
};
const inputStyle = {
    width: "100%",
    padding: "8px",
    marginBottom: "10px",
    border: "1px solid #ddd",
    borderRadius: "3px",
    boxSizing: "border-box",
};
const buttonStyle = {
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
const sampleDataStyle = {
    fontSize: "11px",
    color: "#666",
    marginTop: "10px",
};
const statusStyle = {
    padding: "10px",
    borderRadius: "3px",
    marginTop: "10px",
    fontSize: "12px",
    border: "1px solid",
};
export { FsaptVisualizationApp };

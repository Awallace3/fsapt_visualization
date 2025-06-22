import React from "react";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import "molstar/lib/mol-util/polyfill";
interface FsaptData {
    atom_indices: number[];
    energy_contributions: number[];
    interaction_type: string;
    threshold?: number;
}
export declare function loadStructure(plugin: PluginUIContext, url: string, options?: {
    format?: string;
    isBinary?: boolean;
}): Promise<{
    model: import("molstar/lib/mol-state/object").StateObjectSelector<import("molstar/lib/mol-plugin-state/objects").PluginStateObject.Molecule.Model, import("molstar/lib/mol-state/transformer").StateTransformer<import("molstar/lib/mol-state/object").StateObject<any, import("molstar/lib/mol-state/object").StateObject.Type<any>>, import("molstar/lib/mol-state/object").StateObject<any, import("molstar/lib/mol-state/object").StateObject.Type<any>>, any>>;
    modelProperties: import("molstar/lib/mol-state/object").StateObjectSelector<import("molstar/lib/mol-plugin-state/objects").PluginStateObject.Molecule.Model, import("molstar/lib/mol-state/transformer").StateTransformer<import("molstar/lib/mol-state/object").StateObject<any, import("molstar/lib/mol-state/object").StateObject.Type<any>>, import("molstar/lib/mol-state/object").StateObject<any, import("molstar/lib/mol-state/object").StateObject.Type<any>>, any>>;
    unitcell: import("molstar/lib/mol-state/object").StateObjectSelector<import("molstar/lib/mol-plugin-state/objects").PluginStateObject.Shape.Representation3D, import("molstar/lib/mol-state/transformer").StateTransformer<import("molstar/lib/mol-state/object").StateObject<any, import("molstar/lib/mol-state/object").StateObject.Type<any>>, import("molstar/lib/mol-state/object").StateObject<any, import("molstar/lib/mol-state/object").StateObject.Type<any>>, any>> | undefined;
    structure: import("molstar/lib/mol-state/object").StateObjectSelector<import("molstar/lib/mol-plugin-state/objects").PluginStateObject.Molecule.Structure, import("molstar/lib/mol-state/transformer").StateTransformer<import("molstar/lib/mol-state/object").StateObject<any, import("molstar/lib/mol-state/object").StateObject.Type<any>>, import("molstar/lib/mol-state/object").StateObject<any, import("molstar/lib/mol-state/object").StateObject.Type<any>>, any>>;
    structureProperties: import("molstar/lib/mol-state/object").StateObjectSelector<import("molstar/lib/mol-plugin-state/objects").PluginStateObject.Molecule.Structure, import("molstar/lib/mol-state/transformer").StateTransformer<import("molstar/lib/mol-state/object").StateObject<any, import("molstar/lib/mol-state/object").StateObject.Type<any>>, import("molstar/lib/mol-state/object").StateObject<any, import("molstar/lib/mol-state/object").StateObject.Type<any>>, any>>;
    representation: any;
} | undefined>;
export declare function applyFsaptColoring(plugin: PluginUIContext, fsaptData: FsaptData): Promise<void>;
declare const FsaptVisualizationApp: React.FC;
export { FsaptVisualizationApp };

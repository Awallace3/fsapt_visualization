import { StructureRepresentationPresetProvider } from "molstar/lib/mol-plugin-state/builder/structure/representation-preset";
import { type StructureRef } from "molstar/lib/mol-plugin-state/manager/structure/hierarchy-state";
import { PluginUIComponent } from "molstar/lib/mol-plugin-ui/base";
export declare const StructurePreset: StructureRepresentationPresetProvider<
  {
    ignoreHydrogens: boolean | undefined;
    ignoreHydrogensVariant: "all" | "non-polar" | undefined;
    ignoreLight: boolean | undefined;
    quality:
      | "auto"
      | "medium"
      | "high"
      | "low"
      | "custom"
      | "highest"
      | "higher"
      | "lower"
      | "lowest"
      | undefined;
    theme:
      | import("molstar/lib/mol-util/param-definition").ParamDefinition.Normalize<
        {
          globalName: /*elided*/ any;
          globalColorParams: /*elided*/ any;
          carbonColor: /*elided*/ any;
          symmetryColor: /*elided*/ any;
          symmetryColorParams: /*elided*/ any;
          focus: /*elided*/ any;
        }
      >
      | undefined;
  },
  | {
    components?: undefined;
    representations?: undefined;
  }
  | {
    components: {
      ligand:
        | import("molstar/lib/mol-state").StateObjectSelector<
          import("molstar/lib/mol-plugin-state/objects").PluginStateObject.Molecule.Structure,
          import("molstar/lib/mol-state").StateTransformer<
            import("molstar/lib/mol-state").StateObject<
              any,
              import("molstar/lib/mol-state").StateObject.Type<any>
            >,
            import("molstar/lib/mol-state").StateObject<
              any,
              import("molstar/lib/mol-state").StateObject.Type<any>
            >,
            any
          >
        >
        | undefined;
      polymer:
        | import("molstar/lib/mol-state").StateObjectSelector<
          import("molstar/lib/mol-plugin-state/objects").PluginStateObject.Molecule.Structure,
          import("molstar/lib/mol-state").StateTransformer<
            import("molstar/lib/mol-state").StateObject<
              any,
              import("molstar/lib/mol-state").StateObject.Type<any>
            >,
            import("molstar/lib/mol-state").StateObject<
              any,
              import("molstar/lib/mol-state").StateObject.Type<any>
            >,
            any
          >
        >
        | undefined;
    };
    representations: {
      ligand: import("molstar/lib/mol-state").StateObjectSelector<
        import("molstar/lib/mol-plugin-state/objects").PluginStateObject.Molecule.Structure.Representation3D,
        import("molstar/lib/mol-state").StateTransformer<
          import("molstar/lib/mol-state").StateObject<
            any,
            import("molstar/lib/mol-state").StateObject.Type<any>
          >,
          import("molstar/lib/mol-state").StateObject<
            any,
            import("molstar/lib/mol-state").StateObject.Type<any>
          >,
          any
        >
      >;
      polymer: import("molstar/lib/mol-state").StateObjectSelector<
        import("molstar/lib/mol-plugin-state/objects").PluginStateObject.Molecule.Structure.Representation3D,
        import("molstar/lib/mol-state").StateTransformer<
          import("molstar/lib/mol-state").StateObject<
            any,
            import("molstar/lib/mol-state").StateObject.Type<any>
          >,
          import("molstar/lib/mol-state").StateObject<
            any,
            import("molstar/lib/mol-state").StateObject.Type<any>
          >,
          any
        >
      >;
    };
  }
>;
export declare const IllustrativePreset: StructureRepresentationPresetProvider<
  {
    ignoreHydrogens: boolean | undefined;
    ignoreHydrogensVariant: "all" | "non-polar" | undefined;
    ignoreLight: boolean | undefined;
    quality:
      | "auto"
      | "medium"
      | "high"
      | "low"
      | "custom"
      | "highest"
      | "higher"
      | "lower"
      | "lowest"
      | undefined;
    theme:
      | import("molstar/lib/mol-util/param-definition").ParamDefinition.Normalize<
        {
          globalName: /*elided*/ any;
          globalColorParams: /*elided*/ any;
          carbonColor: /*elided*/ any;
          symmetryColor: /*elided*/ any;
          symmetryColorParams: /*elided*/ any;
          focus: /*elided*/ any;
        }
      >
      | undefined;
  },
  | {
    components?: undefined;
    representations?: undefined;
  }
  | {
    components: {
      ligand:
        | import("molstar/lib/mol-state").StateObjectSelector<
          import("molstar/lib/mol-plugin-state/objects").PluginStateObject.Molecule.Structure,
          import("molstar/lib/mol-state").StateTransformer<
            import("molstar/lib/mol-state").StateObject<
              any,
              import("molstar/lib/mol-state").StateObject.Type<any>
            >,
            import("molstar/lib/mol-state").StateObject<
              any,
              import("molstar/lib/mol-state").StateObject.Type<any>
            >,
            any
          >
        >
        | undefined;
      polymer:
        | import("molstar/lib/mol-state").StateObjectSelector<
          import("molstar/lib/mol-plugin-state/objects").PluginStateObject.Molecule.Structure,
          import("molstar/lib/mol-state").StateTransformer<
            import("molstar/lib/mol-state").StateObject<
              any,
              import("molstar/lib/mol-state").StateObject.Type<any>
            >,
            import("molstar/lib/mol-state").StateObject<
              any,
              import("molstar/lib/mol-state").StateObject.Type<any>
            >,
            any
          >
        >
        | undefined;
    };
    representations: {
      ligand: import("molstar/lib/mol-state").StateObjectSelector<
        import("molstar/lib/mol-plugin-state/objects").PluginStateObject.Molecule.Structure.Representation3D,
        import("molstar/lib/mol-state").StateTransformer<
          import("molstar/lib/mol-state").StateObject<
            any,
            import("molstar/lib/mol-state").StateObject.Type<any>
          >,
          import("molstar/lib/mol-state").StateObject<
            any,
            import("molstar/lib/mol-state").StateObject.Type<any>
          >,
          any
        >
      >;
      polymer: import("molstar/lib/mol-state").StateObjectSelector<
        import("molstar/lib/mol-plugin-state/objects").PluginStateObject.Molecule.Structure.Representation3D,
        import("molstar/lib/mol-state").StateTransformer<
          import("molstar/lib/mol-state").StateObject<
            any,
            import("molstar/lib/mol-state").StateObject.Type<any>
          >,
          import("molstar/lib/mol-state").StateObject<
            any,
            import("molstar/lib/mol-state").StateObject.Type<any>
          >,
          any
        >
      >;
    };
  }
>;
export declare const ShowButtons:
  import("molstar/lib/mol-plugin/config").PluginConfigItem<boolean>;
export declare class ViewportComponent extends PluginUIComponent {
  _set(
    structures: readonly StructureRef[],
    preset: StructureRepresentationPresetProvider,
  ): Promise<void>;
  set: (preset: StructureRepresentationPresetProvider) => Promise<void>;
  structurePreset: () => Promise<void>;
  illustrativePreset: () => Promise<void>;
  surfacePreset: () => Promise<void>;
  pocketPreset: () => Promise<void>;
  interactionsPreset: () => Promise<void>;
  get showButtons(): boolean | undefined;
  render(): import("react/jsx-runtime").JSX.Element;
}

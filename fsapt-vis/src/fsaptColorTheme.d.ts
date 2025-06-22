import { type ThemeDataContext } from "molstar/lib/mol-theme/theme";
import { ParamDefinition as PD } from "molstar/lib/mol-util/param-definition";
import { ColorTheme } from "molstar/lib/mol-theme/color";
import { Color } from "molstar/lib/mol-util/color";
export declare const CustomAtomColorThemeParams: {
    indices: PD.Value<number[]>;
    colors: PD.Value<Color[]>;
};
export type CustomAtomColorThemeParams = typeof CustomAtomColorThemeParams;
export declare function getPerAtomColorThemeParams(ctx: ThemeDataContext): {
    indices: PD.Value<number[]>;
    colors: PD.Value<Color[]>;
};
export declare function CustomPerAtomColorTheme(ctx: ThemeDataContext, props: PD.Values<CustomAtomColorThemeParams>): ColorTheme<CustomAtomColorThemeParams>;
export declare const CustomPerAtomColorThemeProvider: ColorTheme.Provider<CustomAtomColorThemeParams, "custom-per-atom-color">;

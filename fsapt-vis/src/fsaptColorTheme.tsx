import { type ThemeDataContext } from "molstar/src/mol-theme/theme";
import { ParamDefinition as PD } from "molstar/src/mol-util/param-definition";
import { LocationColor, ColorTheme } from "molstar/src/mol-theme/color";
import { ColorNames } from "molstar/src/mol-util/color/names";
import { Color } from "molstar/src/mol-util/color";
import { StructureElement } from "molstar/src/mol-model/structure";
// import { type Location } from "molstar/src/mol-model/structure/structure/element/location";

export const CustomAtomColorThemeParams = {
  indices: PD.Value<number[]>([]),
  colors: PD.Value<Color[]>([]),
};
export type CustomAtomColorThemeParams = typeof CustomAtomColorThemeParams;
export function getPerAtomColorThemeParams(ctx: ThemeDataContext) {
  return CustomAtomColorThemeParams;
}

export function CustomPerAtomColorTheme(
  ctx: ThemeDataContext,
  props: PD.Values<CustomAtomColorThemeParams>,
): ColorTheme<CustomAtomColorThemeParams> {
  const colorMap = new Map<number, Color>();
  if (props.indices && props.colors) {
    for (let i = 0; i < props.indices.length; i++) {
      colorMap.set(props.indices[i], props.colors[i]);
    }
  }
  console.log("CustomPerAtomColorTheme", props, colorMap);

  // const color = (location: Location, isSecondary: boolean): Color => {
  const color = (location: LocationColor): Color => {
    console.log("location:", location);
    if (StructureElement.Location.is(location)) {
      const idx = location.element as number;
      console.log('idx:', idx);
      return colorMap.get(idx) ?? ColorNames.yellow;
    }
    return ColorNames.yellow;
  };
  return {
    factory: CustomPerAtomColorTheme,
    granularity: "vertex",
    color,
    props: props,
    description: "A color theme that colors each atom based on its index.",
  };
}

export const CustomPerAtomColorThemeProvider: ColorTheme.Provider<
  CustomAtomColorThemeParams,
  "custom-per-atom-color"
> = {
  name: "custom-per-atom-color",
  label: "Custom per-atom colors",
  category: ColorTheme.Category.Atom,
  factory: CustomPerAtomColorTheme,
  defaultValues: PD.getDefaultValues(CustomAtomColorThemeParams),
  getParams: getPerAtomColorThemeParams,
  isApplicable: (ctx: ThemeDataContext) => !!ctx.structure,
};

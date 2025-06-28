import { type ThemeDataContext } from "molstar/src/mol-theme/theme";
import { ParamDefinition as PD } from "molstar/src/mol-util/param-definition";
import { ColorTheme } from "molstar/src/mol-theme/color";
import { ColorNames } from "molstar/src/mol-util/color/names";
import { Color } from "molstar/src/mol-util/color";
import { StructureElement } from "molstar/src/mol-model/structure";
import { type Location } from "molstar/src/mol-model/structure/structure/element/location";

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
  const color = (location: Location): Color => {
    for (let i = 0; i < props.colors.length; i++) {
      colorMap.set(props.indices[i], props.colors[i]);
    }

    if (StructureElement.Location.is(location)) {
      const idx = location.element as number;
      return colorMap.get(idx) ?? ColorNames.gray;
    }
    return ColorNames.blue;
  };
  return {
    factory: CustomPerAtomColorTheme,
    granularity: "instance",
    color,
    props: props,
    description: "Per atom color color theme",
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

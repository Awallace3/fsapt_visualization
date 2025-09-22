import { type ThemeDataContext } from "molstar/src/mol-theme/theme";
import { ParamDefinition as PD } from "molstar/src/mol-util/param-definition";
import { ColorTheme } from "molstar/src/mol-theme/color";
import { ColorNames } from "molstar/src/mol-util/color/names";
import { Color } from "molstar/src/mol-util/color";
import { StructureElement, Unit } from "molstar/src/mol-model/structure";
import { type Location } from "molstar/src/mol-model/location";

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
  const absIndexColorMap = new Map<number, Color>();
  if (props.indices && props.colors) {
    for (let i = 0; i < props.indices.length; i++) {
      absIndexColorMap.set(props.indices[i], props.colors[i]);
    }
  }

  const unitStartIndexMap = new Map<number, number>();
  let totalElements = 0;
  if (ctx.structure) {
    for (const unit of ctx.structure.units) {
      unitStartIndexMap.set(unit.id, totalElements);
      totalElements += unit.elements.length;
    }
  }

  const color = (location: Location, isSecondary: boolean): Color => {
    if (StructureElement.Location.is(location)) {
      const unitStartIndex = unitStartIndexMap.get(location.unit.id);
      if (unitStartIndex !== undefined) {
        const absoluteIndex = unitStartIndex + location.element;
        const foundColor = absIndexColorMap.get(absoluteIndex);
        if (foundColor !== undefined) {
          return foundColor;
        }
      }
    }
    return ColorNames.gray; // Default color if not found
  };

  return {
    factory: CustomPerAtomColorTheme,
    granularity: "vertex",
    color,
    props: props,
    description: "A color theme that colors each atom based on its absolute index.",
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

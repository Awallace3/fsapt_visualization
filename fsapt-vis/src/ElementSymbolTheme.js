import { Color, ColorMap } from "molstar/lib/mol-util/color";
import { Bond, StructureElement, Unit } from "molstar/lib/mol-model/structure";
import { ParamDefinition as PD } from "molstar/lib/mol-util/param-definition";
import { TableLegend } from "molstar/lib/mol-util/legend";
import { getAdjustedColorMap } from "molstar/lib/mol-util/color/color";
import { getColorMapParams } from "molstar/lib/mol-util/color/params";
import {
  ChainIdColorTheme,
  ChainIdColorThemeParams,
} from "molstar/lib/mol-theme/color/chain-id";
import {
  OperatorNameColorTheme,
  OperatorNameColorThemeParams,
} from "molstar/lib/mol-theme/color/operator-name";
import {
  EntityIdColorTheme,
  EntityIdColorThemeParams,
} from "molstar/lib/mol-theme/color/entity-id";
import { assertUnreachable } from "molstar/lib/mol-util/type-helpers";
import {
  EntitySourceColorTheme,
  EntitySourceColorThemeParams,
} from "molstar/lib/mol-theme/color/entity-source";
import {
  ModelIndexColorTheme,
  ModelIndexColorThemeParams,
} from "molstar/lib/mol-theme/color/model-index";
import {
  StructureIndexColorTheme,
  StructureIndexColorThemeParams,
} from "molstar/lib/mol-theme/color/structure-index";
import { ColorThemeCategory } from "molstar/lib/mol-theme/color/categories";
import {
  UnitIndexColorTheme,
  UnitIndexColorThemeParams,
} from "molstar/lib/mol-theme/color/unit-index";
import {
  UniformColorTheme,
  UniformColorThemeParams,
} from "molstar/lib/mol-theme/color/uniform";
import {
  TrajectoryIndexColorTheme,
  TrajectoryIndexColorThemeParams,
} from "molstar/lib/mol-theme/color/trajectory-index";
// from Jmol http://jmol.sourceforge.net/jscolors/ (or 0xFFFFFF)
export const ElementSymbolColors = ColorMap({
  "H": 0x000000,
  "D": 0x000000,
  "T": 0x000000,
  "HE": 0x000000,
  "LI": 0x000000,
  "BE": 0x000000,
  "B": 0x000000,
  "C": 0x000000,
  "N": 0x000000,
  "O": 0x000000,
  "F": 0x000000,
  "NE": 0x000000,
  "NA": 0x000000,
  "MG": 0x000000,
  "AL": 0x000000,
  "SI": 0x000000,
  "P": 0x000000,
  "S": 0x000000,
  "CL": 0x000000,
  "AR": 0x000000,
  "K": 0x000000,
  "CA": 0x000000,
  "SC": 0x000000,
  "TI": 0x000000,
  "V": 0x000000,
  "CR": 0x000000,
  "MN": 0x000000,
  "FE": 0x000000,
  "CO": 0x000000,
  "NI": 0x000000,
  "CU": 0x000000,
  "ZN": 0x000000,
  "GA": 0x000000,
  "GE": 0x000000,
  "AS": 0x000000,
  "SE": 0x000000,
  "BR": 0x000000,
  "KR": 0x000000,
  "RB": 0x000000,
  "SR": 0x000000,
  "Y": 0x000000,
  "ZR": 0x000000,
  "NB": 0x000000,
  "MO": 0x000000,
  "TC": 0x000000,
  "RU": 0x000000,
  "RH": 0x000000,
  "PD": 0x000000,
  "AG": 0x000000,
  "CD": 0x000000,
  "IN": 0x000000,
  "SN": 0x000000,
  "SB": 0x000000,
  "TE": 0x000000,
  "I": 0x000000,
  "XE": 0x000000,
  "CS": 0x000000,
  "BA": 0x000000,
  "LA": 0x000000,
  "CE": 0x000000,
  "PR": 0x000000,
  "ND": 0x000000,
  "PM": 0x000000,
  "SM": 0x000000,
  "EU": 0x000000,
  "GD": 0x000000,
  "TB": 0x000000,
  "DY": 0x000000,
  "HO": 0x000000,
  "ER": 0x000000,
  "TM": 0x000000,
  "YB": 0x000000,
  "LU": 0x000000,
  "HF": 0x000000,
  "TA": 0x000000,
  "W": 0x000000,
  "RE": 0x000000,
  "OS": 0x000000,
  "IR": 0x000000,
  "PT": 0x000000,
  "AU": 0x000000,
  "HG": 0x000000,
  "TL": 0x000000,
  "PB": 0x000000,
  "BI": 0x000000,
  "PO": 0x000000,
  "AT": 0x000000,
  "RN": 0x000000,
  "FR": 0x000000,
  "RA": 0x000000,
  "AC": 0x000000,
  "TH": 0x000000,
  "PA": 0x000000,
  "U": 0x000000,
  "NP": 0x000000,
  "PU": 0x000000,
  "AM": 0x000000,
  "CM": 0x000000,
  "BK": 0x000000,
  "CF": 0x000000,
  "ES": 0x000000,
  "FM": 0x000000,
  "MD": 0x000000,
  "NO": 0x000000,
  "LR": 0x000000,
  "RF": 0x000000,
  "DB": 0x000000,
  "SG": 0x000000,
  "BH": 0x000000,
  "HS": 0x000000,
  "MT": 0x000000,
  "DS": 0x000000,
  "RG": 0x000000,
  "CN": 0x000000,
  "UUT": 0x000000,
  "FL": 0x000000,
  "UUP": 0x000000,
  "LV": 0x000000,
  "UUH": 0x000000,
});
const DefaultElementSymbolColor = Color(0xFFFFFF);
const Description =
  "Assigns a color to every atom according to its chemical element.";
export const ElementSymbolColorThemeParams = {
  carbonColor: PD.MappedStatic("chain-id", {
    "chain-id": PD.Group(ChainIdColorThemeParams),
    "unit-index": PD.Group(UnitIndexColorThemeParams, {
      label: "Chain Instance",
    }),
    "entity-id": PD.Group(EntityIdColorThemeParams),
    "entity-source": PD.Group(EntitySourceColorThemeParams),
    "operator-name": PD.Group(OperatorNameColorThemeParams),
    "model-index": PD.Group(ModelIndexColorThemeParams),
    "structure-index": PD.Group(StructureIndexColorThemeParams),
    "trajectory-index": PD.Group(TrajectoryIndexColorThemeParams),
    "uniform": PD.Group(UniformColorThemeParams),
    "element-symbol": PD.EmptyGroup(),
  }, { description: "Use chain-id coloring for carbon atoms." }),
  saturation: PD.Numeric(0, { min: -6, max: 6, step: 0.1 }),
  lightness: PD.Numeric(0.2, { min: -6, max: 6, step: 0.1 }),
  colors: PD.MappedStatic("default", {
    "default": PD.EmptyGroup(),
    "custom": PD.Group(getColorMapParams(ElementSymbolColors)),
  }),
};
export function getElementSymbolColorThemeParams(ctx) {
  return PD.clone(ElementSymbolColorThemeParams);
}
export function elementSymbolColor(colorMap, element) {
  const c = colorMap[element];
  return c === undefined ? DefaultElementSymbolColor : c;
}
function getCarbonTheme(ctx, props) {
  switch (props.name) {
    case "chain-id":
      return ChainIdColorTheme(ctx, props.params);
    case "unit-index":
      return UnitIndexColorTheme(ctx, props.params);
    case "entity-id":
      return EntityIdColorTheme(ctx, props.params);
    case "entity-source":
      return EntitySourceColorTheme(ctx, props.params);
    case "operator-name":
      return OperatorNameColorTheme(ctx, props.params);
    case "model-index":
      return ModelIndexColorTheme(ctx, props.params);
    case "structure-index":
      return StructureIndexColorTheme(ctx, props.params);
    case "trajectory-index":
      return TrajectoryIndexColorTheme(ctx, props.params);
    case "uniform":
      return UniformColorTheme(ctx, props.params);
    case "element-symbol":
      return undefined;
    default:
      assertUnreachable(props);
  }
}
export function ElementSymbolColorTheme(ctx, props) {
  var _a;
  const colorMap = getAdjustedColorMap(
    props.colors.name === "default" ? ElementSymbolColors : props.colors.params,
    props.saturation,
    props.lightness,
  );
  const carbonTheme = getCarbonTheme(ctx, props.carbonColor);
  const carbonColor = carbonTheme === null || carbonTheme === void 0
    ? void 0
    : carbonTheme.color;
  const contextHash =
    (_a = carbonTheme === null || carbonTheme === void 0
          ? void 0
          : carbonTheme.contextHash) !== null && _a !== void 0
      ? _a
      : -1;
  function elementColor(element, location) {
    return (carbonColor && element === "C")
      ? carbonColor(location, false)
      : elementSymbolColor(colorMap, element);
  }
  function color(location) {
    if (StructureElement.Location.is(location)) {
      if (Unit.isAtomic(location.unit)) {
        const { type_symbol } = location.unit.model.atomicHierarchy.atoms;
        return elementColor(type_symbol.value(location.element), location);
      }
    } else if (Bond.isLocation(location)) {
      if (Unit.isAtomic(location.aUnit)) {
        const { type_symbol } = location.aUnit.model.atomicHierarchy.atoms;
        const element = type_symbol.value(
          location.aUnit.elements[location.aIndex],
        );
        return elementColor(element, location);
      }
    }
    return DefaultElementSymbolColor;
  }
  const granularity =
    (props.carbonColor.name === "operator-name" ||
        props.carbonColor.name === "unit-index")
      ? "groupInstance"
      : "group";
  return {
    factory: ElementSymbolColorTheme,
    granularity,
    preferSmoothing: true,
    color,
    props,
    contextHash,
    description: Description,
    legend: TableLegend(
      Object.keys(colorMap).map((name) => {
        return [name, colorMap[name]];
      }),
    ),
  };
}
export const ElementSymbolColorThemeProvider = {
  name: "element-symbol",
  label: "Element Symbol",
  category: ColorThemeCategory.Atom,
  factory: ElementSymbolColorTheme,
  getParams: getElementSymbolColorThemeParams,
  defaultValues: PD.getDefaultValues(ElementSymbolColorThemeParams),
  isApplicable: (ctx) => !!ctx.structure,
};

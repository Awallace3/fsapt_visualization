import {} from "molstar/lib/mol-theme/theme";
import { ParamDefinition as PD } from "molstar/lib/mol-util/param-definition";
import { ColorTheme } from "molstar/lib/mol-theme/color";
import { ColorNames } from "molstar/lib/mol-util/color/names";
import { Color } from "molstar/lib/mol-util/color";
import { StructureElement } from "molstar/lib/mol-model/structure";
import {} from "molstar/lib/mol-model/structure/structure/element/location";
export const CustomAtomColorThemeParams = {
    indices: PD.Value([]),
    colors: PD.Value([]),
};
export function getPerAtomColorThemeParams(ctx) {
    return CustomAtomColorThemeParams;
}
export function CustomPerAtomColorTheme(ctx, props) {
    const colorMap = new Map();
    const color = (location) => {
        for (let i = 0; i < props.colors.length; i++) {
            colorMap.set(props.indices[i], props.colors[i]);
        }
        if (StructureElement.Location.is(location)) {
            const idx = location.element;
            return colorMap.get(idx) ?? ColorNames.gray;
        }
        return ColorNames.blue;
    };
    return {
        factory: CustomPerAtomColorTheme,
        granularity: "instance",
        color: color,
        props: props,
        description: "Per atom color color theme",
    };
}
export const CustomPerAtomColorThemeProvider = {
    name: "custom-per-atom-color",
    label: "Custom per-atom colors",
    category: ColorTheme.Category.Atom,
    factory: CustomPerAtomColorTheme,
    defaultValues: PD.getDefaultValues(CustomAtomColorThemeParams),
    getParams: getPerAtomColorThemeParams,
    isApplicable: (ctx) => !!ctx.structure,
};

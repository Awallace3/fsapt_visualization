import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import "molstar/lib/mol-plugin-ui/skin/dark.scss";
declare global {
    interface Window {
        molstar?: PluginUIContext;
    }
}
export declare function MolStarWrapper(): import("react/jsx-runtime").JSX.Element;

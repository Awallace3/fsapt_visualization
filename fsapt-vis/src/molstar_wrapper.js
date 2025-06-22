import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import { useEffect, createRef } from "react";
import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { renderReact18 } from "molstar/lib/mol-plugin-ui/react18";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
/*  Might require extra configuration,
see https://webpack.js.org/loaders/sass-loader/ for example.
create-react-app should support this natively. */
import "molstar/lib/mol-plugin-ui/skin/dark.scss";
export function MolStarWrapper() {
    const parent = createRef();
    // In debug mode of react's strict mode, this code will
    // be called twice in a row, which might result in unexpected behavior.
    useEffect(() => {
        async function init() {
            window.molstar = await createPluginUI({
                target: parent.current,
                render: renderReact18
            });
            const data = await window.molstar.builders.data.download({ url: "https://files.rcsb.org/download/3PTB.pdb" }, /* replace with your URL */ { state: { isGhost: true } });
            const trajectory = await window.molstar.builders.structure.parseTrajectory(data, "pdb");
            await window.molstar.builders.structure.hierarchy.applyPreset(trajectory, "default");
        }
        init();
        return () => {
            window.molstar?.dispose();
            window.molstar = undefined;
        };
    }, []);
    return _jsx("div", { ref: parent, style: { width: 240, height: 280 } });
}

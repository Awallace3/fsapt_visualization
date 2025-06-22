import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// import React from "react";
import "./App.css";
import { FsaptVisualizationApp } from "./molstar_vis.tsx";
// import {MolStarWrapper} from "./molstar_wrapper.tsx";
function App() {
    return (_jsxs("div", { children: [_jsx("h1", { children: "FSAPT Visualization" }), _jsx(FsaptVisualizationApp, {})] }));
    // return (
    //   <div>
    //     <h1>FSAPT Visualization</h1>
    //     <MolStarWrapper/>
    //   </div>
    // );
}
export default App;

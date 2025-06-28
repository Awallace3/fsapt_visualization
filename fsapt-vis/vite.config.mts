import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    // alias: {
    //   'molstar': 'https://cdn.jsdelivr.net/gh/molstar/molstar@dev/dist/molstar.js',
    // },
  },
  optimizeDeps: {
    include: [
        "molstar/lib/mol-plugin-ui",
        "style-to-js",
        "util",
        "debug",
        "esbuild",
        "fp-ts",
        "react",
        "react-dom",
        "@eslint/js",
        "@vitejs/plugin-react",
        "eslint",
        "eslint-plugin-react-hooks",
        "eslint-plugin-react-refresh",
        "globals",
        "typescript",
        "typescript-eslint",
        "vite",
        "extend",
      ],
    esbuildOptions: { loader: { ".js": "jsx" } },
  },
  plugins: [react()],
});

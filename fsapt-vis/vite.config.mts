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
      ],
    esbuildOptions: { loader: { ".js": "jsx" } } },
  plugins: [react()],
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: { esbuildOptions: { loader: { ".js": "jsx" } } },
  plugins: [react()],
});

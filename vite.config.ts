import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// https://vitejs.dev/config/
export default defineConfig({
  // The React Compiler auto-memoizes render-phase work, so components here deliberately
  // do not hand-place useMemo/useCallback.
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  resolve: {},
  build: {
    sourcemap: true,
    target: "es2025",
  },
  base: "/",
});

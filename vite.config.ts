import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

function disableHighchartsAutoload() {
  return {
    name: "disable-highcharts-autoload",
    transform(code: string, id: string) {
      if (id.includes("@highcharts/react") && id.endsWith(".js")) {
        return {
          code: code.replace(/const seriesModuleLoaders = \{[\s\S]*?\};/, "const seriesModuleLoaders = {};"),
          map: null,
        };
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  // The React Compiler auto-memoizes render-phase work, so components here deliberately
  // do not hand-place useMemo/useCallback.
  plugins: [disableHighchartsAutoload(), react(), babel({ presets: [reactCompilerPreset()] })],
  resolve: {},
  build: {
    sourcemap: true,
    target: "es2025",
  },
  base: "/",
});

import { defineConfig } from "vitest/config";

// Deliberately separate from vite.config.ts. That config applies the React Compiler through
// @rolldown/plugin-babel, a build-side plugin; the suite is pure logic in a node environment
// and has no use for it.
export default defineConfig({
  test: {
    environment: "node",
    // Explicit `import { describe, it, expect } from "vitest"` instead of globals, so tsconfig
    // needs no `types` array. Adding one would drop the @types/* packages it currently picks
    // up implicitly (gapi, chrome, google.accounts).
    globals: false,
    include: ["tests/**/*.test.ts"],
  },
});

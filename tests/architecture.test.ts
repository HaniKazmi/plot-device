/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../src", import.meta.url));

// Omnibus is a domain that composes domains: the guard below still forbids common/ and utils/
// from importing it, and omnibus/ importing vg/, show/ and movie/ is the direction that keeps
// every shared shell domain-blind.
const DOMAINS = ["vg", "show", "movie", "omnibus"];

/**
 * Every form a module reference takes here: `from "y"`, the bare side-effect `import "y"`, and
 * `import("y")`.
 *
 * The last is not hypothetical — `lazy(() => import("./Graphs"))` is how all four tabs load their
 * charts, so a pattern that only matched the static forms would be blind to the one this codebase
 * actually reaches for. It needs its own alternative because a paren stands where the others have
 * whitespace.
 */
const IMPORT_SPECIFIER = /(?:from\s+|import\s+|import\s*\(\s*(?:\/\*[\s\S]*?\*\/\s*)?)["']([^"']+)["']/g;

const sourceFilesUnder = (dir: string): string[] =>
  readdirSync(join(SRC, dir), { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));

const importsFrom = (file: string) =>
  [...readFileSync(file, "utf8").matchAll(IMPORT_SPECIFIER)].map((match) => match[1]);

describe("the shared layer never depends on a domain", () => {
  // common/ and utils/ are generic by contract: they take behaviour as props and callbacks,
  // and each domain supplies the meaning. An import pointing the other way would also create
  // a cycle, because every domain imports back out of utils/ for statusToColour.
  const shared = [...sourceFilesUnder("common"), ...sourceFilesUnder("utils")];

  it("finds the shared layer to check", () => {
    expect(shared.length).toBeGreaterThan(10);
  });

  it.each(DOMAINS)("has no import of %s/ anywhere in common/ or utils/", (domain) => {
    const offenders = shared.flatMap((file) =>
      importsFrom(file)
        .filter((specifier) => new RegExp(`(^|/)${domain}(/|$)`).test(specifier))
        .map((specifier) => `${file.replace(SRC, "src")} imports ${specifier}`),
    );

    expect(offenders).toEqual([]);
  });

  it("sees a dynamic import, which is how every tab loads its own charts", () => {
    expect(importsFrom(join(SRC, "vg", "vg.tsx"))).toContain("./Graphs");
  });
});

describe("a tracked domain never depends on another", () => {
  // The other half of the rule `omnibus/` exists under: it composes the three tracked domains, and
  // they compose nothing. Without this, the direction that makes `omnibus/` a composing domain
  // rather than one arm of a cycle is enforced in one direction only.
  const TRACKED = ["vg", "show", "movie"];

  it.each(TRACKED)("has no import of another domain anywhere in %s/", (domain) => {
    const others = [...DOMAINS].filter((other) => other !== domain);

    const offenders = sourceFilesUnder(domain).flatMap((file) =>
      importsFrom(file)
        .filter((specifier) => others.some((other) => new RegExp(`(^|/)${other}(/|$)`).test(specifier)))
        .map((specifier) => `${file.replace(SRC, "src")} imports ${specifier}`),
    );

    expect(offenders).toEqual([]);
  });
});

describe("prototype extensions are imported where they are used", () => {
  // Array.prototype.sum and Map.prototype.setIfAbsent install as an import side effect. A
  // module that calls one without importing it works only while some other module happens to
  // be loaded first, which is a load-order accident rather than a guarantee.
  const EXTENSIONS = [
    { method: "sum", module: "arrayUtils" },
    { method: "sortByKey", module: "arrayUtils" },
    { method: "setIfAbsent", module: "mapUtils" },
  ];

  const allFiles = [...sourceFilesUnder("common"), ...sourceFilesUnder("utils"), ...DOMAINS.flatMap(sourceFilesUnder)];

  it.each(EXTENSIONS)("every caller of .$method imports $module", ({ method, module }) => {
    const offenders = allFiles
      .filter((file) => !file.endsWith(`${module}.ts`))
      .filter((file) => new RegExp(`\\.${method}\\(`).test(readFileSync(file, "utf8")))
      .filter((file) => !importsFrom(file).some((specifier) => specifier.includes(module)))
      .map((file) => file.replace(SRC, "src"));

    expect(offenders).toEqual([]);
  });
});

describe("browser globals are not read at module load", () => {
  // Node 24 and later expose localStorage and sessionStorage; Node 22, which CI runs, does not.
  // A module-scope `const storage = localStorage` therefore imports fine on a developer machine
  // and throws on CI — and would also break any non-browser use of the module. Reading the
  // global inside the function that needs it costs nothing and works everywhere.
  const BROWSER_GLOBALS = ["localStorage", "sessionStorage", "document", "window", "navigator"];

  const allFiles = [
    ...sourceFilesUnder("common"),
    ...sourceFilesUnder("utils"),
    ...DOMAINS.flatMap(sourceFilesUnder),
    ...sourceFilesUnder("contexts"),
    // The `src/` root too: `App.tsx` and `Google.tsx` are modules like any other, and an
    // entry point is the first thing a non-browser context imports.
    ...readdirSync(SRC, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
      .map((entry) => join(entry.parentPath, entry.name)),
  ];

  /**
   * A module-scope read of `global`, in any of the forms that reach one.
   *
   * `export` may lead the declaration, and the read may be of a member rather than of the whole
   * object — `const w = window.innerWidth` throws exactly as `const w = window` does. What is
   * deliberately not matched is the sanctioned idiom, `const storage = () => localStorage`: the
   * arrow between the `=` and the global is what makes the read lazy, and the pattern requires the
   * global to follow the `=` directly.
   */
  const moduleScopeRead = (global: string) =>
    // Only top-level statements: an indented line is inside a function and evaluates lazily, which
    // is why no leading whitespace is allowed in either alternative.
    new RegExp(
      // Bound to a name: `const x = window`, `export const x = window.innerWidth`.
      `^(?:export\\s+)?(?:const|let|var)\\s+\\w+\\s*(?::[^=]+)?=\\s*${global}\\s*[.;,[]` +
        // Or touched as a statement of its own: `window.foo = 1`, `(window as X).foo ||= window`.
        `|^\\(?${global}\\b`,
      "m",
    );

  it.each(BROWSER_GLOBALS)("no module-scope read of %s", (global) => {
    const offenders = allFiles
      .filter((file) => moduleScopeRead(global).test(readFileSync(file, "utf8")))
      .map((file) => file.replace(SRC, "src"));

    expect(offenders).toEqual([]);
  });

  it.each([
    ["a bare alias", "const storage = localStorage;"],
    ["an exported alias", "export const storage = localStorage;"],
    ["a member read", "const height = localStorage.length;"],
    ["a bare statement", "localStorage.setItem('k', 'v');"],
    ["a statement behind a cast", "(localStorage as unknown as { x: string }).x ||= 'v';"],
  ])("catches %s", (_, source) => {
    expect(moduleScopeRead("localStorage").test(source)).toBe(true);
  });

  it.each([
    ["the lazy accessor every module here uses", "const storage = () => localStorage;"],
    ["a read inside a function", "function f() {\n  const s = localStorage;\n}"],
  ])("leaves %s alone", (_, source) => {
    expect(moduleScopeRead("localStorage").test(source)).toBe(false);
  });
});

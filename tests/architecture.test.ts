/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import ts from "typescript";

const SRC = fileURLToPath(new URL("../src", import.meta.url));

// Omnibus is a domain that composes domains: the guard below still forbids common/ and utils/
// from importing it, and omnibus/ importing vg/, show/ and movie/ is the direction that keeps
// every shared shell domain-blind.
const DOMAINS = ["vg", "show", "movie", "books", "omnibus"];

/**
 * Every form a module reference takes here: `from "y"`, the bare side-effect `import "y"`, and
 * `import("y")`.
 *
 * The last is not hypothetical — `lazy(() => import("./Graphs"))` is how all four tabs load their
 * charts, so a pattern that only matched the static forms would be blind to the one this codebase
 * actually reaches for. It needs its own alternative because a paren stands where the others have
 * whitespace.
 */
const IMPORT_SPECIFIER = /(?:from\s+|import\s+|import\s*\(\s*)["']([^"']+)["']/g;

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
  // The other half of the rule `omnibus/` exists under: it composes the four tracked domains, and
  // they compose nothing. Without this, the direction that makes `omnibus/` a composing domain
  // rather than one arm of a cycle is enforced in one direction only.
  const TRACKED = ["vg", "show", "movie", "books"];

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
   * The globals a module reads while it is being imported, by parsing rather than by matching.
   *
   * A pattern has to enumerate the shapes a read can take — a binding, an exported binding, a
   * member access, a bare statement, a destructuring, a cast — and it silently passes every shape
   * nobody thought of. Walking the top-level statements asks the question directly instead: any
   * reference to one of these names outside a function body runs at import time.
   *
   * A function body is where the read becomes lazy, which is the whole of the sanctioned idiom
   * (`const storage = () => localStorage`), so descending into one is skipped entirely.
   */
  const moduleScopeGlobals = (source: string): string[] => {
    const parsed = ts.createSourceFile("module.tsx", source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
    const found = new Set<string>();

    /** Whether an expression asks a browser global whether it exists, e.g. `typeof window !== …`. */
    const asksWhetherItExists = (node: ts.Node): boolean =>
      ts.isTypeOfExpression(node)
        ? ts.isIdentifier(node.expression) && BROWSER_GLOBALS.includes(node.expression.text)
        : (ts.forEachChild(node, asksWhetherItExists) ?? false);

    const walk = (node: ts.Node) => {
      if (ts.isFunctionLike(node)) return;

      // A read behind a check for the global's own existence is the other safe form: it is what a
      // shim that has to run at import time does, and it cannot throw in the context that lacks it.
      if (ts.isIfStatement(node) && asksWhetherItExists(node.expression)) {
        if (node.elseStatement) walk(node.elseStatement);
        return;
      }

      // The name half of `a.document` is a property, not a reference to the global.
      const isPropertyName = ts.isPropertyAccessExpression(node.parent) && node.parent.name === node;
      if (ts.isIdentifier(node) && !isPropertyName && BROWSER_GLOBALS.includes(node.text)) found.add(node.text);
      ts.forEachChild(node, walk);
    };

    parsed.statements.forEach(walk);
    return [...found];
  };

  /**
   * The one module allowed to read a browser global while it loads.
   *
   * `main.tsx` mounts React onto an element, so a document is its precondition rather than an
   * incidental dependency, and nothing imports it — there is no non-browser context that could
   * reach it. Named here rather than missed by a pattern, so the exemption is a decision.
   */
  const DOM_ENTRY_POINT = join(SRC, "main.tsx");

  it("finds a module-scope read wherever one is written", () => {
    // The entry point is the proof the walk works, and the reason the list above has one entry.
    expect(moduleScopeGlobals(readFileSync(DOM_ENTRY_POINT, "utf8"))).toEqual(["document"]);
  });

  it("has no module-scope read of a browser global outside the entry point", () => {
    const offenders = allFiles
      .filter((file) => file !== DOM_ENTRY_POINT)
      .flatMap((file) =>
        moduleScopeGlobals(readFileSync(file, "utf8")).map((global) => `${file.replace(SRC, "src")} reads ${global}`),
      );

    expect(offenders).toEqual([]);
  });

  it("leaves the lazy accessor every module here uses alone", () => {
    // The arrow is the whole point: the global is read when the function is called, not on import.
    expect(moduleScopeGlobals("const storage = () => localStorage;")).toEqual([]);
    expect(moduleScopeGlobals("function f() {\n  const s = localStorage;\n}")).toEqual([]);
  });

  it("leaves a read behind an existence check alone, which is what a shim needs", () => {
    expect(moduleScopeGlobals('if (typeof window !== "undefined") {\n  window.x = window;\n}')).toEqual([]);
    // Only the guarded branch: the else runs precisely where the global is absent.
    expect(moduleScopeGlobals('if (typeof window !== "undefined") {\n} else {\n  window.x = 1;\n}')).toEqual([
      "window",
    ]);
  });

  it.each([
    ["a bare alias", "const storage = localStorage;", "localStorage"],
    ["an exported alias", "export const storage = localStorage;", "localStorage"],
    ["a member read", "const height = localStorage.length;", "localStorage"],
    ["a bare statement", "localStorage.setItem('k', 'v');", "localStorage"],
    ["a statement behind a cast", "(localStorage as unknown as { x: string }).x ||= 'v';", "localStorage"],
    // The three a pattern missed, which is the whole reason this walks the tree instead.
    ["a destructuring", "const { getItem } = localStorage;", "localStorage"],
    ["a cast", "const s = localStorage as Storage;", "localStorage"],
    ["a call argument", "createRoot(document.getElementById('root')!);", "document"],
  ])("catches %s", (_, source, global) => {
    expect(moduleScopeGlobals(source)).toEqual([global]);
  });
});

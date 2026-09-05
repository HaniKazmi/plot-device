/// <reference types="node" />
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import ts from "typescript";

const SRC = fileURLToPath(new URL("../src", import.meta.url));

// Omnibus is the fifth tracked domain: it composes nothing, and reaches `app/` — the one folder
// that composes the other four — for whatever it needs of them.
const DOMAINS = ["vg", "show", "movie", "books", "omnibus"];

// The composing layer: the one folder that may import every domain, holding what each medium
// answers so no surface has to dispatch on which one it is holding.
const COMPOSING = "app";

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

/**
 * A relative specifier resolved to the source file it names, trying the extensions and the
 * `index` forms a bare directory import takes. `undefined` for a bare specifier (a package name,
 * never a path under `src/`) or one nothing on disk answers to.
 */
const resolveSpecifier = (fromFile: string, specifier: string): string | undefined => {
  if (!specifier.startsWith(".")) return undefined;
  const stem = join(dirname(fromFile), specifier);
  return [stem, `${stem}.ts`, `${stem}.tsx`, join(stem, "index.ts"), join(stem, "index.tsx")].find((candidate) =>
    existsSync(candidate),
  );
};

/**
 * Every file an entry point reaches, following relative imports to a fixed point. A direct import
 * is the shallowest form the registry cycle takes: a `module.ts` that imports something which
 * itself imports `app/` closes the same loop one hop later, evaluated while `app/media.ts` is
 * still building the entry that `module.ts` is one of.
 */
const importClosure = (entry: string): Set<string> => {
  const reached = new Set<string>();
  const pending = [entry];
  while (pending.length > 0) {
    const file = pending.pop()!;
    if (reached.has(file)) continue;
    reached.add(file);
    // `tabs.ts` is a boundary, not a hop: it eagerly imports all five entry components, so
    // crossing it turns any module naming its `SheetTab` type into one that "reaches" the whole
    // app through every tab — a fact about routing order the section above already covers.
    if (/(^|\/)tabs\.tsx?$/.test(file)) continue;
    importsFrom(file)
      .map((specifier) => resolveSpecifier(file, specifier))
      .filter((resolved): resolved is string => resolved !== undefined && !reached.has(resolved))
      .forEach((resolved) => pending.push(resolved));
  }
  return reached;
};

describe("the shared layer never depends on a domain", () => {
  // common/ and utils/ are generic by contract: they take behaviour as props and callbacks,
  // and each domain supplies the meaning. An import pointing the other way would also create
  // a cycle, because every domain imports back out of utils/ for statusToColour.
  const shared = [...sourceFilesUnder("common"), ...sourceFilesUnder("utils")];

  it("finds the shared layer to check", () => {
    expect(shared.length).toBeGreaterThan(10);
  });

  it.each([...DOMAINS, COMPOSING])("has no import of %s/ anywhere in common/ or utils/", (domain) => {
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
  const TRACKED = ["vg", "show", "movie", "books"];

  // Omnibus composes nothing of its own: the union, the gallery, search and the franchise view
  // reach `app/` for what they need of the four domains. Three files still reach across directly,
  // because the registry carries no member for what they ask: `adapter.ts`'s `electNow` elects
  // across all four domains' own `statsData`, `Stats.tsx`'s Now band renders each domain's own
  // `CardMediaImage` and reads its `cardData` subtitle and `statsData` hero figures, and
  // `Graphs.tsx` mounts the four `FranchiseContext` providers the card strips and crossings read.
  // Giving the registry an election, a hero-card slot and a franchise-context slot per medium is a
  // registry change, not a move, so these three are named exemptions rather than a loosened rule.
  const REACHES_DOMAINS_DIRECTLY = ["omnibus/adapter.ts", "omnibus/Stats.tsx", "omnibus/Graphs.tsx"];

  it.each([...TRACKED, "omnibus"])("has no import of another domain anywhere in %s/", (domain) => {
    const others = DOMAINS.filter((other) => other !== domain);

    const offenders = sourceFilesUnder(domain)
      .filter((file) => !REACHES_DOMAINS_DIRECTLY.some((exempt) => file.replace(SRC, "src").endsWith(exempt)))
      .flatMap((file) =>
        importsFrom(file)
          .filter((specifier) => others.some((other) => new RegExp(`(^|/)${other}(/|$)`).test(specifier)))
          .map((specifier) => `${file.replace(SRC, "src")} imports ${specifier}`),
      );

    expect(offenders).toEqual([]);
  });

  // The registry is built *from* the four modules, so a domain importing it is a genuine cycle:
  // `vg/module.ts` → `app/media.ts` → `vg/module.ts`, evaluated half-built and failing as a blank
  // page rather than an error. The rest of `app/` is the composing layer a tab reads downwards —
  // its entry component asks `app/library.ts` for the library the shell fetched — and imports
  // nothing back out of a domain's own module, so that direction cycles nothing.
  const REGISTRY = /(^|\/)app\/media(Lazy)?(\.tsx?)?$/;

  it.each(TRACKED)("has no import of the registry itself anywhere in %s/", (domain) => {
    const offenders = sourceFilesUnder(domain).flatMap((file) =>
      importsFrom(file)
        .filter((specifier) => REGISTRY.test(specifier))
        .map((specifier) => `${file.replace(SRC, "src")} imports ${specifier}`),
    );

    expect(offenders).toEqual([]);
  });

  it("names the registry in both its halves and nothing else in app/", () => {
    expect(REGISTRY.test("../app/media")).toBe(true);
    expect(REGISTRY.test("../app/mediaLazy")).toBe(true);
    expect(REGISTRY.test("../app/library")).toBe(false);
  });

  it("has no import of app/ at all in any domain's module.ts", () => {
    // The registry's own members, so anything they reach is reached while the registry is being
    // built: `app/library.ts` imports it, and a module importing that closes the same cycle by one
    // more hop. A module answers questions and asks the composing layer none.
    const offenders = DOMAINS.flatMap(sourceFilesUnder)
      .filter((file) => /(^|\/)module(\.lazy)?\.tsx?$/.test(file))
      .flatMap((file) =>
        importsFrom(file)
          .filter((specifier) => new RegExp(`(^|/)${COMPOSING}(/|$)`).test(specifier))
          .map((specifier) => `${file.replace(SRC, "src")} imports ${specifier}`),
      );

    expect(offenders).toEqual([]);
  });

  it("has no transitive import of app/ anywhere in a domain's module.ts closure", () => {
    // A direct import is the shallowest way a `module.ts` reaches `app/`: something it imports
    // without naming `app/` itself, that in turn imports `app/`, closes the cycle above one hop
    // later — evaluated while `app/media.ts` is still building the entry this `module.ts` is one
    // of, and failing the same way, a blank page rather than an error.
    const modules = DOMAINS.flatMap(sourceFilesUnder).filter((file) => /(^|\/)module(\.lazy)?\.tsx?$/.test(file));

    const offenders = modules.flatMap((module) =>
      [...importClosure(module)]
        .filter((file) => file !== module && new RegExp(`(^|/)${COMPOSING}(/|$)`).test(file.replace(SRC, "src")))
        .map((file) => `${module.replace(SRC, "src")} reaches ${file.replace(SRC, "src")}`),
    );

    expect(offenders).toEqual([]);
  });
});

describe("the registry never reaches back for a tab", () => {
  // `tabs.ts` imports the five entry components eagerly and an entry component reaches the
  // registry, so an import back from the registry evaluates it while `tabs.ts` is still in its own
  // temporal dead zone — `MEDIA` half-built, and the failure a blank page rather than an error. A
  // module carries `tabId: string` instead, and the one component that resolves an id to a tab is
  // mounted by the shell, below both.
  //
  // Two files in `app/` are exempt, for two different reasons rather than one relaxed rule.
  // `LibraryProvider.tsx` is that one component, eager and below both. `SearchSurface.tsx` is not
  // eager at all — `Search.tsx` reaches it only through `import("./SearchSurface")`, so its module
  // does not evaluate until that chunk loads, well after `tabs.ts` has finished — and it reads
  // `tabs.ts` for the palette's own "Go to" jump list, a tab's icon and bar colour among them.
  const EXEMPT_FROM_TAB_IMPORT = ["LibraryProvider.tsx", "SearchSurface.tsx"];

  // The extension is optional in the specifier and written both ways here — `vg.tsx` imports
  // `"./filterUtils.ts"` beside `"../tabs"` — so a pattern anchored on the bare name alone would
  // pass exactly the import it exists to catch.
  const namesTabs = (file: string) => importsFrom(file).filter((specifier) => /(^|\/)tabs(\.tsx?)?$/.test(specifier));

  it("has no import of tabs.ts in app/, but for the files that are eager below it or reached only after it", () => {
    const offenders = sourceFilesUnder(COMPOSING)
      .filter((file) => !EXEMPT_FROM_TAB_IMPORT.some((exempt) => file.endsWith(exempt)))
      .filter((file) => namesTabs(file).length > 0)
      .map((file) => file.replace(SRC, "src"));

    expect(offenders).toEqual([]);
  });

  it("has no import of tabs.ts in any domain's module.ts", () => {
    const offenders = DOMAINS.flatMap(sourceFilesUnder)
      .filter((file) => /(^|\/)module\.tsx?$/.test(file))
      .filter((file) => namesTabs(file).length > 0)
      .map((file) => file.replace(SRC, "src"));

    expect(offenders).toEqual([]);
  });

  it("finds the modules to check, so the rule above is not vacuous", () => {
    const modules = DOMAINS.flatMap(sourceFilesUnder).filter((file) => /(^|\/)module\.tsx?$/.test(file));

    expect(modules.length).toBe(4);
  });
});

describe("the medium is dispatched in one place", () => {
  // A `switch (item.medium)` is a fifth medium's edit in whichever surface happened to need it
  // first, and the compiler only catches the ones written as an exhaustive switch over a union —
  // never the one somebody wrote with a default. The registry answers instead, so a surface asks
  // `MEDIA[item.medium]` and the four arms live in the four domain folders.
  const SWITCHES_ON_MEDIUM = /switch\s*\(\s*[\w.]*medium\s*\)/;

  const allFiles = [...sourceFilesUnder("common"), ...sourceFilesUnder("utils"), ...DOMAINS.flatMap(sourceFilesUnder)];

  it("has no switch on a medium outside app/", () => {
    const offenders = allFiles
      .filter((file) => SWITCHES_ON_MEDIUM.test(readFileSync(file, "utf8")))
      .map((file) => file.replace(SRC, "src"));

    expect(offenders).toEqual([]);
  });

  it("catches the shapes a dispatch is written in", () => {
    expect(SWITCHES_ON_MEDIUM.test("switch (item.medium) {")).toBe(true);
    expect(SWITCHES_ON_MEDIUM.test("switch (medium) {")).toBe(true);
    // The other discriminants this codebase switches on are none of its business.
    expect(SWITCHES_ON_MEDIUM.test("switch (category) {")).toBe(false);
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

  const allFiles = [
    ...sourceFilesUnder("common"),
    ...sourceFilesUnder("utils"),
    ...sourceFilesUnder(COMPOSING),
    ...DOMAINS.flatMap(sourceFilesUnder),
  ];

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
    ...sourceFilesUnder(COMPOSING),
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

/// <reference types="node" />
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import ts from "typescript";

const SRC = fileURLToPath(new URL("../src", import.meta.url));

// Omnibus is the fifth tracked domain: it composes nothing, and reaches `app/` — the one folder
// that composes the other four — for whatever it needs of them.
const DOMAINS = ["game", "show", "movie", "book", "omnibus"];

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

/** One module reference, and whether importing this file evaluates the module it names. */
interface ModuleImport {
  specifier: string;
  evaluated: boolean;
}

/**
 * The same references, read off the syntax tree so that the three forms can be told apart.
 *
 * An `import type` statement is erased outright and an `import(…)` is fetched when something asks
 * rather than while the importer is evaluating, so neither can put a module in a temporal dead
 * zone. Only the *statement* form counts as erased: `import { type X } from "y"` leaves an import
 * statement standing, and whether the emitter drops it is a compiler setting away from changing.
 *
 * A re-export carries a specifier too, and `module.lazy.ts` is nothing but re-exports.
 */
const moduleImports = (file: string): ModuleImport[] => {
  const parsed = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
  const found: ModuleImport[] = [];

  const walk = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier))
      found.push({ specifier: node.moduleSpecifier.text, evaluated: !node.importClause?.isTypeOnly });
    else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier))
      found.push({ specifier: node.moduleSpecifier.text, evaluated: !node.isTypeOnly });
    else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      ts.isStringLiteral(node.arguments[0])
    )
      found.push({ specifier: node.arguments[0].text, evaluated: false });

    ts.forEachChild(node, walk);
  };

  walk(parsed);
  return found;
};

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

/**
 * The same walk, following only the references the importer's own evaluation reaches: an erased
 * type import runs no module, and a dynamic one runs after whatever is loading now has finished.
 * A closure over every reference would report a cycle through a file the running app never
 * evaluates in that order.
 *
 * `tabs.ts` is a boundary here for `importClosure`'s reason, and because the rule about the registry
 * is about the edge *into* it: crossing it would reach the whole app through five entry components.
 * `crossTabs` walks through it instead, for the one question whose answer is exactly what those
 * five entry components drag with them — what the browser evaluates before it paints anything.
 */
const evaluatedClosure = (entry: string, crossTabs = false): Set<string> => {
  const reached = new Set<string>();
  const pending = [entry];
  while (pending.length > 0) {
    const file = pending.pop()!;
    if (reached.has(file)) continue;
    reached.add(file);
    if (!crossTabs && /(^|\/)tabs\.tsx?$/.test(file)) continue;
    moduleImports(file)
      .filter((entry) => entry.evaluated)
      .map((entry) => resolveSpecifier(file, entry.specifier))
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
    expect(importsFrom(join(SRC, "game", "Game.tsx"))).toContain("./Graphs");
  });
});

describe("a tracked domain never depends on another", () => {
  const TRACKED = ["game", "show", "movie", "book"];

  // Omnibus composes nothing of its own: the union, the gallery, search, the Now band and the
  // franchise view reach `app/` for what they need of the four domains. One file still reaches
  // across directly. `Graphs.tsx` mounts the four `FranchiseContext` providers the card strips and
  // the crossings read, and the four are not one shape: Books stands a second provider inside its
  // own for the epoch every book strip opens at. A per-medium provider member would also have to
  // be what each domain's *own* `Graphs` mounts, or the tree would hold two definitions of one
  // provider — four more files than this exemption costs.
  const REACHES_DOMAINS_DIRECTLY = ["omnibus/Graphs.tsx"];

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
  // `game/module.ts` → `app/media.ts` → `game/module.ts`, evaluated half-built and failing as a blank
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

  it("has no import of app/ anywhere in a domain's module.ts closure", () => {
    // The modules are the registry's own members, so anything they reach is reached while the
    // registry is being built: `app/library.ts` imports it, and a module importing that closes the
    // cycle — `MEDIA` half-built, and the failure a blank page rather than an error. A module
    // answers questions and asks the composing layer none.
    //
    // The closure and not the first-degree specifiers, because naming `app/` directly is only the
    // shallowest form: something a module imports without naming `app/` itself, that in turn
    // imports `app/`, closes the same cycle one hop later.
    const modules = DOMAINS.flatMap(sourceFilesUnder).filter((file) => /(^|\/)module(\.lazy)?\.tsx?$/.test(file));

    const offenders = modules.flatMap((module) =>
      [...importClosure(module)]
        .filter((file) => file !== module && new RegExp(`(^|/)${COMPOSING}(/|$)`).test(file.replace(SRC, "src")))
        .map((file) => `${module.replace(SRC, "src")} reaches ${file.replace(SRC, "src")}`),
    );

    expect(offenders).toEqual([]);
  });

  // The composing layer holds what more than one tab reads, and the Omnibus is a tab: an `app/`
  // file reaching into `omnibus/` means the shared half of some surface is sitting inside one
  // page's folder, where the next tab that wants it has to reach across for it.
  //
  // `pageState.ts` is the one exception, and stays one because the Omnibus is a tab and not a
  // medium: every other tab's store is registered through its `MediumModule`, and this one is
  // registered by name until the composing tab has a module of its own.
  const MAY_IMPORT_OMNIBUS = ["pageState.ts"];

  it("has no import of omnibus/ in app/, but for the tab store registered by name", () => {
    const offenders = sourceFilesUnder(COMPOSING)
      .filter((file) => !MAY_IMPORT_OMNIBUS.some((exempt) => file.endsWith(exempt)))
      .flatMap((file) =>
        importsFrom(file)
          .filter((specifier) => /(^|\/)omnibus(\/|$)/.test(specifier))
          .map((specifier) => `${file.replace(SRC, "src")} imports ${specifier}`),
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
  // Four files in `app/` are exempt, for three different reasons rather than one relaxed rule.
  // `LibraryProvider.tsx` is that one component, eager and below both. `SearchSurface.tsx` and
  // `PageRail.tsx` are not eager at all — the first is reached only through
  // `import("./SearchSurface")` and the second only from a tab's own lazy `Graphs`, so neither
  // module evaluates until that chunk loads, well after `tabs.ts` has finished. Both read the tab
  // the reader is on: the palette for its "Go to" jump list, a tab's icon and bar colour among
  // them, and the rail for the page whose controls it is drawing.
  //
  // `page.ts` is the lookup those two and the shell share, so it *is* eager — and safe for a third
  // reason: `Google.tsx` imports `tabs.ts` itself, so this adds no edge the evaluated closure
  // lacks, and nothing the registry reaches imports it. That last is the load-bearing half, and
  // the rule below about a module's own closure is what keeps it true.
  const EXEMPT_FROM_TAB_IMPORT = ["LibraryProvider.tsx", "SearchSurface.tsx", "PageRail.tsx", "/page.ts"];

  // The extension is optional in the specifier and written both ways here — `Game.tsx` imports
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

  it("has no evaluated import of tabs.ts anywhere in a domain's module.ts closure", () => {
    // Naming `tabs.ts` in the module itself is only the shallowest form: something the module
    // imports that in turn imports it evaluates `tabs.ts` at the same moment, one hop later, with
    // the registry half-built and the failure a blank page rather than an error.
    //
    // Evaluated imports alone, in the closure and in the check. Every `module.ts` here reaches
    // `common/useData.ts`, which names `SheetTab` through an `import type` — erased, so no module
    // is loaded and no order is fixed. Counting that as a reach would make the rule unsatisfiable
    // for a module that has to declare its own `DataConfig`.
    const modules = DOMAINS.flatMap(sourceFilesUnder).filter((file) => /(^|\/)module\.tsx?$/.test(file));

    const offenders = modules.flatMap((module) =>
      [...evaluatedClosure(module)].flatMap((file) =>
        moduleImports(file)
          .filter((entry) => entry.evaluated && /(^|\/)tabs(\.tsx?)?$/.test(entry.specifier))
          .map(() => `${module.replace(SRC, "src")} reaches tabs.ts through ${file.replace(SRC, "src")}`),
      ),
    );

    expect(offenders).toEqual([]);
  });

  it("tells an erased import of tabs.ts from one the app evaluates", () => {
    // The rule is only worth as much as this distinction: `useData.ts` names `SheetTab` and is in
    // every module's closure, so a check that could not see the `type` keyword would fail on the
    // tree as it stands and be deleted rather than fixed.
    const useData = join(SRC, "common", "useData.ts");
    const named = moduleImports(useData).filter((entry) => /(^|\/)tabs(\.tsx?)?$/.test(entry.specifier));

    expect(named.map((entry) => entry.evaluated)).toEqual([false]);
  });

  it("finds the modules to check, so the rule above is not vacuous", () => {
    const modules = DOMAINS.flatMap(sourceFilesUnder).filter((file) => /(^|\/)module\.tsx?$/.test(file));

    expect(modules.length).toBe(4);
  });
});

describe("the popper engine stays off the first paint", () => {
  // MUI's `Tooltip` mounts Popper, and Popper brings `@popperjs/core` with it: about 11 kB gzipped
  // of positioning engine, on the chunk the browser evaluates before it paints anything. Nothing
  // on a first paint hovers — the two surfaces that need it are a chart's hover card
  // (`common/HoverCardTooltip.tsx`) and a timeline band naming its own span (`common/Card.tsx`),
  // both inside a tab's lazy chunk — so an evaluated import of it anywhere `main.tsx` reaches is
  // that engine paid for by every visitor, whether or not they ever hover anything.
  //
  // The closure crosses `tabs.ts` here, unlike every rule above: what the five entry components
  // drag in with them is precisely the question.
  const MUI_TOOLTIP_PATH = "@mui/material/Tooltip";

  /**
   * Whether a file's own evaluated imports bring MUI's `Tooltip`, by either of its two names: the
   * named export off the package, or its own deep path.
   *
   * Read off the syntax tree, so an `import type` statement and a `{ type Tooltip }` specifier are
   * both seen for what they are — erased, and no module loaded. `TooltipProps` is a type and a
   * different name, so the check is on the imported name and not on a substring of the line.
   */
  const importsMuiTooltip = (file: string): boolean => {
    const parsed = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.ESNext,
      true,
      ts.ScriptKind.TSX,
    );
    let found = false;

    const walk = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && !node.importClause?.isTypeOnly) {
        const specifier = node.moduleSpecifier.text;
        if (specifier === MUI_TOOLTIP_PATH) found = true;
        const named = node.importClause?.namedBindings;
        if (specifier === "@mui/material" && named && ts.isNamedImports(named))
          found ||= named.elements.some(
            (element) => !element.isTypeOnly && (element.propertyName ?? element.name).text === "Tooltip",
          );
      }
      ts.forEachChild(node, walk);
    };

    walk(parsed);
    return found;
  };

  it("has no evaluated import of MUI's Tooltip anywhere main.tsx reaches", () => {
    const offenders = [...evaluatedClosure(join(SRC, "main.tsx"), true)]
      .filter(importsMuiTooltip)
      .map((file) => file.replace(SRC, "src"));

    expect(offenders).toEqual([]);
  });

  it("still reaches the two files that do import it, so the rule above is not vacuous", () => {
    const importers = [join(SRC, "common", "HoverCardTooltip.tsx"), join(SRC, "common", "Card.tsx")];

    expect(importers.filter(importsMuiTooltip)).toEqual(importers);
  });

  it("crosses tabs.ts, which is where the five entry components hang", () => {
    const reached = evaluatedClosure(join(SRC, "main.tsx"), true);

    expect(reached.has(join(SRC, "game", "Game.tsx"))).toBe(true);
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

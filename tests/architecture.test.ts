/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../src", import.meta.url));

const DOMAINS = ["vg", "show", "movie", "holiday"];

/** Both `import x from "y"` and the bare `import "y"` side-effect form. */
const IMPORT_SPECIFIER = /(?:from\s+|import\s+)["']([^"']+)["']/g;

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
        .filter((specifier) => new RegExp(`(^|/)${domain}/`).test(specifier))
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

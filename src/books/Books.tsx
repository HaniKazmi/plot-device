import { lazy } from "react";
import { createTabEntry } from "../app/tabEntry";
import { useFilterReducer, type FilterState } from "./filterUtils";
import type { Book } from "./types";

/**
 * The one `import()` of the charts, at module scope: the React Compiler cannot lower an import
 * expression, and one written inside a component or hook takes that whole function out of
 * compilation, silently. The entry starts the download from it and `lazy` renders it.
 */
const loadGraphs = () => import("./Graphs");

/**
 * The records and the state are named rather than inferred: `lazy()` hands back an exotic
 * component TypeScript cannot read a prop type out of, so the tab says what its charts are drawn
 * over and the two are checked against each other here.
 */
export default createTabEntry<Book, FilterState>({
  medium: "book",
  loadGraphs,
  Graphs: lazy(loadGraphs),
  useFilterReducer,
});

import { lazy } from "react";
import { createTabEntry } from "../app/tabEntry";
import { useFilterReducer } from "./filterUtils.ts";

/**
 * The one `import()` of the charts, at module scope: the React Compiler cannot lower an import
 * expression, and one written inside a component or hook takes that whole function out of
 * compilation, silently. The entry starts the download from it and `lazy` renders it.
 */
const loadGraphs = () => import("./Graphs");

/**
 * Nothing is named: the medium is inferred from the word below and its records follow from it, so
 * the library slice, the filter state and the charts are checked against one another here rather
 * than each asserted to be the same tab's.
 */
export default createTabEntry({
  medium: "game",
  loadGraphs,
  Graphs: lazy(loadGraphs),
  useFilterReducer,
});

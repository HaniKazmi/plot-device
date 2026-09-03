import type { SegmentOption } from "./SelectionComponents";

/**
 * Segments for values that are already the words on them — a measure, a view, a density. A module
 * of its own rather than an export beside the control, since a function exported from a file of
 * components is a hot-reload boundary the lint rules refuse.
 */
export const segments = <T extends string>(values: readonly T[]): SegmentOption<T>[] =>
  values.map((value) => ({ value, label: value }));

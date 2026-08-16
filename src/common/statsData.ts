import { assignPercents } from "../utils/mathUtils";
import type { Colour } from "../utils/types";

/**
 * Turns a whitelist of group values into the proportional segments of a `TotalStack`, dropping
 * any group nothing falls into.
 *
 * `total` is the measure over the *whole* dataset, not over the segments. When `group` does not
 * cover every value present in the data, the uncovered rows still count toward the total but
 * produce no segment, and `assignPercents` folds that entire shortfall into the first entry —
 * it is built to absorb rounding, not a missing category.
 */
export const groupTotals = <T extends string, U, K extends keyof U>(
  data: U[],
  group: T[],
  groupKey: K,
  measureFunc: (data: U[]) => number,
  groupToColour: (ele: T) => Colour,
) =>
  assignPercents(
    group.flatMap((e) => {
      const count = measureFunc(data.filter((item) => item[groupKey] === e));
      return count > 0 ? [{ name: e, count, colour: groupToColour(e) }] : [];
    }),
    measureFunc(data),
  );

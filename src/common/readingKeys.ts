import { CURRENT_YEAR } from "./date";
import { stepIndex, usePageKeys } from "./keyboard";
import { steppedScope, toggledScope, type YearScope } from "./scope";

/**
 * The keys for a page's whole-page readings: `m` steps the measure, `y` moves the year scope
 * between everything and the year in progress, and `,` `.` step the scope a year back or on.
 *
 * Bound to the state rather than to the controls drawing it, because the controls are not always
 * mounted where the state is: below `md` the scope leaves the rail for the box, and below `sm` the
 * measure goes with it, while a tablet with a keyboard attached is exactly the reader at that width.
 *
 * `scope` is optional for a page reading no years. The measure steps rather than naming a value,
 * since a page's measures are its own list — two on most tabs, three where a library counts pages.
 */
export const useReadingKeys = <M extends string>(props: {
  measures: readonly M[];
  measure: M;
  onMeasure: (measure: M) => void;
  scope?: YearScope & { earliestYear: number; onScope: (scope: YearScope) => void };
}) => {
  usePageKeys("my,.", (key) => {
    const { measures, measure, scope } = props;
    if (key === "m") {
      if (measures.length < 2) return false;
      props.onMeasure(measures[stepIndex(measures.indexOf(measure), 1, measures.length)]);
      return true;
    }
    if (!scope) return false;
    if (key === "y") {
      scope.onScope(toggledScope(scope.yearTo, scope.yearType, CURRENT_YEAR));
      return true;
    }
    if (key === "," || key === ".") {
      const next = steppedScope(scope.yearTo, scope.yearType, key === "." ? 1 : -1, scope.earliestYear, CURRENT_YEAR);
      if (next) scope.onScope(next);
      return next !== undefined;
    }
    return false;
  });
};

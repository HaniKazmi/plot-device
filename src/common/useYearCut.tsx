import { useState } from "react";
import { CutButton } from "./SelectionComponents";
import { all } from "./population";

/**
 * How many years a stack of them draws before the rest are left behind its cut: the recent ones,
 * which are what a stack of years is opened to compare, and a screen's worth of rows at any width.
 */
const YEARS_SHOWN = 8;

/**
 * The years a stack of them holds back, and the control that draws them — Stacked and the month
 * grid alike, so the two cut at one place and word it one way. `[limit, cut]`: how many rows to
 * draw, and the worded cut for a stack of `total`, drawn only where there are more than that and,
 * once the rest are drawn, the way back.
 */
export const useYearCut = () => {
  const [everyYear, setEveryYear] = useState(false);
  const cut = (total: number) =>
    total > YEARS_SHOWN && (
      <CutButton
        label={everyYear ? `Last ${YEARS_SHOWN} years` : `${all(total)} years`}
        onClick={() => setEveryYear(!everyYear)}
      />
    );
  return [everyYear ? Infinity : YEARS_SHOWN, cut] as const;
};

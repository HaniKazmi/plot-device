import { Box, ButtonBase, CardContent, Typography } from "@mui/material";
import { monthStringsArray, shortYear, type YearNumber } from "./date";
import { MUTED_FIGURE_SX, focusRingSx } from "./typography";
import { useElementWidth } from "./useElementWidth";
import { useCoarsePointer } from "./useCoarsePointer";
import { useYearCut } from "./useYearCut";
import { PictureHover } from "./PictureHover";
import { CONTAIN_SIDEWAYS_SCROLL } from "./scrollbarSx";
import type { TimelineData } from "./timelineLayout";
import { monthRows } from "./timelineStripData";

/**
 * The narrowest the grid is drawn, below which it scrolls sideways inside its card: a month column
 * of about 56px, which holds a banner 27px tall — past that twelve columns are a row of thumbnails
 * nobody can tell apart, and a phone reads a year through the log instead.
 */
const MIN_WIDTH = 760;
const YEAR_COLUMN = 44;
/** The space between cells, which is also the space between the pictures inside one. */
const GAP = 4;
const CELL_PADDING = 4;

const TABLE_SX = {
  width: "100%",
  minWidth: MIN_WIDTH,
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: `${GAP}px`,
} as const;

const MONTH_SX = { ...MUTED_FIGURE_SX, fontSize: 11, fontWeight: 500, textAlign: "left", padding: "0 2px" } as const;

const CELL_SX = {
  verticalAlign: "top",
  backgroundColor: "action.hover",
  borderRadius: 1,
  padding: `${CELL_PADDING}px`,
} as const;

const FLOW_SX = { display: "flex", flexWrap: "wrap", gap: `${GAP}px`, alignItems: "flex-start" } as const;

const MARK_SX = { display: "flex", flexDirection: "column", gap: "2px" } as const;

const STRIPE_SX = { height: 3, borderRadius: "2px" } as const;

const YEAR_PRESS_SX = { borderRadius: 1, paddingX: 0.5 } as const;

/**
 * The timeline as pictures: a row per year and a column per month, each item's own artwork standing
 * in the month it began, a line beneath it in the colour the Colour picker gives it.
 *
 * Stacked with pictures in place of bands: it keeps when as well as what — seasonality reads down
 * the columns as it does there — and every item is on screen, named by its own artwork. A film,
 * with no span to draw, is its banner rather than a tick. The pictures are sized from the measured
 * width so a banner fills its month and two posters or covers stand side by side in one; below
 * `MIN_WIDTH` the grid keeps its columns and scrolls sideways inside the card.
 *
 * A year's label scopes the page to it, as Stacked's does, and the same latest years stand with the
 * rest behind the same cut. A picture opens its mark's item through `onOpen`, as a band does.
 */
export const MonthGrid = ({
  data,
  onYear,
  onOpen,
}: {
  data: TimelineData[];
  onYear: (year: YearNumber) => void;
  onOpen: (mark: TimelineData) => void;
}) => {
  const [ref, measured] = useElementWidth<HTMLDivElement>();
  // Asked once for the grid, which is hundreds of pictures answering one question.
  const coarse = useCoarsePointer();
  const [limit, cut] = useYearCut();
  const rows = monthRows(data);
  const cutButton = cut(rows.length);

  // A month's width, and the height at which a 16:9 banner fills it inside the cell's padding.
  const width = Math.max(measured || 900, MIN_WIDTH);
  const month = (width - YEAR_COLUMN - GAP * 14) / 12;
  const height = Math.max(20, Math.floor(((month - 2 * CELL_PADDING) * 9) / 16));

  return (
    <CardContent>
      <Box
        ref={ref}
        sx={{ overflowX: "auto", ...CONTAIN_SIDEWAYS_SCROLL }}
      >
        <Box
          component="table"
          sx={TABLE_SX}
        >
          <thead>
            <tr>
              <Box
                component="th"
                sx={{ width: YEAR_COLUMN }}
              />
              {monthStringsArray.map((name) => (
                <Box
                  component="th"
                  scope="col"
                  key={name}
                  sx={MONTH_SX}
                >
                  {name}
                </Box>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((row) => (
              <tr key={row.year}>
                <Box
                  component="td"
                  sx={{ verticalAlign: "top" }}
                >
                  <ButtonBase
                    onClick={() => onYear(row.year)}
                    aria-label={`In ${row.year}`}
                    sx={(theme) => ({ ...YEAR_PRESS_SX, ...focusRingSx(theme) })}
                  >
                    <Typography
                      variant="caption"
                      sx={MUTED_FIGURE_SX}
                    >
                      {shortYear(row.year)}
                    </Typography>
                  </ButtonBase>
                </Box>
                {row.months.map((marks, index) => (
                  <Box
                    component="td"
                    key={monthStringsArray[index]}
                    sx={CELL_SX}
                  >
                    <Box sx={FLOW_SX}>
                      {marks.map((mark) => (
                        <PictureHover
                          key={mark.key}
                          mark={mark}
                          coarse={coarse}
                        >
                          <Box sx={MARK_SX}>
                            {mark.picture ? (
                              mark.picture(height, { onOpen: () => onOpen(mark), openLabel: mark.name })
                            ) : (
                              // A mark with no picture of its own keeps its place in the month as a
                              // block of its colour, the width of a banner, and the press a picture
                              // would have: its card ignores the pointer, so this is the way in.
                              <ButtonBase
                                onClick={() => onOpen(mark)}
                                aria-label={mark.name}
                                sx={(theme) => focusRingSx(theme)}
                                style={{ height, width: (height * 16) / 9, backgroundColor: mark.colour }}
                              />
                            )}
                            <Box
                              sx={STRIPE_SX}
                              style={{ backgroundColor: mark.colour }}
                            />
                          </Box>
                        </PictureHover>
                      ))}
                    </Box>
                  </Box>
                ))}
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
      {cutButton && <Box sx={{ display: "flex", justifyContent: "flex-end", paddingTop: 1 }}>{cutButton}</Box>}
    </CardContent>
  );
};

import { CalendarMonth } from "@mui/icons-material";
import { Box, ButtonBase, CardContent, Stack, Typography } from "@mui/material";
import type { YearNumber } from "../common/date";
import { SectionHeader } from "../common/SectionHeader";
import { ExpandableCard } from "../common/Stats";
import { all, stated } from "../common/population";
import { focusRingSx, MUTED_FIGURE_SX } from "../common/typography";
import { useElementWidth } from "../common/useElementWidth";
import { usePhone } from "../common/breakpoints";
import { CARD_LIST } from "../common/cardStep";
import type { OmniItem } from "../common/medium";
import { measureOf } from "../app/library";
import { mediumToLabel, type Measure, type Medium } from "../app/types";
import { format } from "../utils/mathUtils";
import { yearbook, type YearbookYear } from "./yearbookData";
import { PictureCell } from "./PictureCell";
import { MediumFigures } from "./MediumFigures";
import { PICTURE_GAP, TILE_GRID_SX, tilesPerRow } from "./tileGrid";

/**
 * A year's tile: the game's banner across the top, the show's poster and the book's cover side by
 * side beneath it, and the film's banner across the foot.
 *
 * Each banner takes the tile's whole width so it stands near a portrait's size: a banner the width
 * of a poster beside it is a strip with about 40% of the poster's area, where across the tile it
 * has about 1.5 times a portrait's, and neither shape is cropped to get there — a banner keeps its
 * title, which is usually the artwork's own logo.
 */
const TILE_ROWS: readonly (readonly Medium[])[] = [["game"], ["show", "book"], ["movie"]];

/**
 * Rows of tiles before the cut: one from `sm` up, a row there being five or six years, and two on a
 * phone, whose row is two.
 */
const ROWS_SHOWN = 1;
const PHONE_ROWS_SHOWN = 2;

const YEAR_PRESS_SX = { borderRadius: 1, paddingX: 0.5, marginLeft: -0.5 } as const;

const FIGURES_SX = {
  display: { xs: "grid", sm: "flex" },
  gridTemplateColumns: "repeat(2, max-content)",
  flexWrap: "wrap",
  columnGap: 1.5,
} as const;

const TILE_SX = { display: "flex", flexDirection: "column", gap: `${PICTURE_GAP}px` } as const;
/** A row's cells share its width equally: one banner across, or the two portraits side by side. */
const ROW_SX = { display: "flex", gap: `${PICTURE_GAP}px`, "& > *": { flex: "1 1 0" } } as const;

/**
 * The union a year at a time, newest first: what the year added up to, and the one game, season,
 * film and book it is remembered by (`yearbook`), as a tile per year.
 *
 * What "Hours by year" cannot say: that chart states how much each year held, and this states what.
 * A year's name scopes the page to it, as a year's label on the timeline does, so a year that looks
 * worth a closer look is one press from every section reading it.
 *
 * The tiles fill the row, as many as fit, and one row of them stands before the cut — a count read
 * off the measured width from `sm` up, since how many years a row holds is the card's width and
 * nothing else — and two rows of two on a phone. The worded cut opens every year fullscreen, as
 * every cut list in the app does.
 */
const Yearbook = ({
  items,
  measure,
  onYear,
}: {
  items: OmniItem[];
  measure: Measure;
  onYear: (year: YearNumber) => void;
}) => {
  const years = yearbook(items);
  const [gridRef, gridWidth] = useElementWidth<HTMLDivElement>();
  const phone = usePhone();
  const limit = tilesPerRow(gridWidth, phone) * (phone ? PHONE_ROWS_SHOWN : ROWS_SHOWN);

  return (
    <ExpandableCard
      title="Yearbook"
      expandable={years.length > limit}
      cutLabel={`${all(years.length)} years`}
      renderContent={(isDialog, toggle) => (
        <>
          <SectionHeader
            icon={<CalendarMonth />}
            title="Yearbook"
            action={toggle}
            compactActions
          />
          <CardContent>
            <Box
              // Measured inline alone: the dialog draws every year, as many to a row as fit.
              ref={isDialog ? undefined : gridRef}
              {...CARD_LIST}
              sx={TILE_GRID_SX}
            >
              {(isDialog ? years : years.slice(0, limit)).map((year) => (
                <YearTile
                  key={year.year}
                  year={year}
                  measure={measure}
                  onYear={onYear}
                />
              ))}
            </Box>
          </CardContent>
        </>
      )}
    />
  );
};

/** One year: its name and total, the same total by medium, and the year's work in each. */
const YearTile = ({
  year,
  measure,
  onYear,
}: {
  year: YearbookYear;
  measure: Measure;
  onYear: (year: YearNumber) => void;
}) => {
  const figures = year.headliners.map(({ medium }) => {
    const text = format(
      measureOf(
        year.items.filter((item) => item.medium === medium),
        measure,
      ),
    );
    return { medium, text, label: `${mediumToLabel(medium)}: ${text}` };
  });

  return (
    <Stack spacing={0.5}>
      <Stack
        direction="row"
        sx={{ alignItems: "baseline", flexWrap: "wrap", columnGap: 1.5, rowGap: 0.25 }}
      >
        <ButtonBase
          onClick={() => onYear(year.year)}
          aria-label={`In ${year.year}`}
          sx={(theme) => ({ ...YEAR_PRESS_SX, ...focusRingSx(theme) })}
        >
          <Typography variant="h6">{year.year}</Typography>
        </ButtonBase>
        <Typography
          variant="body2"
          sx={MUTED_FIGURE_SX}
        >
          {stated(measureOf(year.items, measure), measure.toLowerCase())}
        </Typography>
      </Stack>
      {/* Two by two on a phone, whose tile holds three figures a line and would leave the fourth
          alone. */}
      <MediumFigures
        figures={figures}
        sx={FIGURES_SX}
      />
      <Box sx={TILE_SX}>
        {TILE_ROWS.map((row) => (
          <Box
            key={row.join("-")}
            sx={ROW_SX}
          >
            {row.map((medium) => (
              <PictureCell
                key={medium}
                medium={medium}
                // The poster and the cover side by side stand level at the poster's ratio.
                shape={row.length > 1 ? "poster" : undefined}
                item={year.headliners.find((item) => item.medium === medium)}
              />
            ))}
          </Box>
        ))}
      </Box>
    </Stack>
  );
};

export default Yearbook;

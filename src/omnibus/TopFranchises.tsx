import { Stars } from "@mui/icons-material";
import { Box, CardContent, Stack, Typography } from "@mui/material";
import { useContext } from "react";
import { SectionHeader } from "../common/SectionHeader";
import { EXPANDED_CARDS, ExpandableCard } from "../common/Stats";
import { FranchiseLink } from "../common/ValueLink";
import { FranchisePageContext } from "../common/franchiseUnion";
import { usePhone, useStackedCharts } from "../common/breakpoints";
import { CARD_LIST } from "../common/cardStep";
import { all, cut, stated } from "../common/population";
import { MUTED_FIGURE_SX } from "../common/typography";
import { useElementWidth } from "../common/useElementWidth";
import type { OmniItem } from "../common/medium";
import type { Measure } from "../app/types";
import { mediumUnit } from "../utils/types";
import { format } from "../utils/mathUtils";
import { MediumFigures } from "./MediumFigures";
import { PictureCell } from "./PictureCell";
import { PICTURE_GAP, TILE_GAP, TILE_GRID_SX, tilesPerRow } from "./tileGrid";
import { franchiseWorks, PICTURES_PER_FRANCHISE, topFranchises, type FranchiseCard } from "./topFranchisesData";

/** Two rows of cards before the cut, where the section has the page's width to itself. */
const ROWS_SHOWN = 2;
/** Beside the yearbook, three franchises a row and three rows, at whatever width the pair gives. */
const FILL_PER_ROW = 3;
const FILL_ROWS = 3;
/**
 * The franchises the fullscreen wall draws: the picture budget every other expanded list keeps
 * (`EXPANDED_CARDS`), at the pictures a card holds. Every franchise would be near seven hundred
 * cards and nearly three thousand pictures mounted in the one commit the dialog opens on.
 */
const DIALOG_FRANCHISES = Math.floor(EXPANDED_CARDS / PICTURES_PER_FRANCHISE);

/** The card filling its half of the pair, its contents a column the wall can stretch down. */
const CARD_FILL_SX = { height: "100%", display: "flex", flexDirection: "column" } as const;
const CONTENT_FILL_SX = { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } as const;
/**
 * The box the wall fills beside the yearbook. The wall stands in it absolutely, so it is the pair's
 * height that sizes the box and never the wall: drawn in flow, the wall would ask for its own
 * height, and the pair would stretch the yearbook to it instead.
 */
const BOX_FILL_SX = { flex: 1, minHeight: 0, position: "relative" } as const;

/**
 * The card's pictures as one strip at the card's 16:9, each at the strip's height and the width its
 * shape gives it, newest first and cut at the card's edge: a banner fills it, posters and covers
 * stand two and a half abreast. Filling the yearbook's height, the strip takes whatever its row
 * leaves instead, up to that same 16:9 of the card's width (`cqw`, the tile being a size container):
 * taller, a banner at the strip's height is wider than its card and the card cuts it short, so the
 * row's spare height falls under the words instead.
 */
const STRIP_SX = { display: "flex", gap: `${PICTURE_GAP}px`, aspectRatio: "16 / 9", overflow: "hidden" } as const;
const STRIP_FILL_SX = {
  display: "flex",
  gap: `${PICTURE_GAP}px`,
  flex: "1 1 0",
  minHeight: 0,
  maxHeight: "56.25cqw",
  overflow: "hidden",
} as const;
const TILE_SX = { minWidth: 0, minHeight: 0, containerType: "inline-size" } as const;
const STRIP_CELL_SX = { height: "100%", flex: "0 0 auto" } as const;

const NOWRAP_SX = { whiteSpace: "nowrap" } as const;

const FIGURES_SX = { display: "flex", flexWrap: "wrap", columnGap: 1.5 } as const;

/**
 * The franchises of the union as a wall of cards, biggest first in the page's measure: each its
 * newest works, its name, how much of it there is and when it ran, and how many entries each medium
 * holds (`topFranchises`). A card opens its franchise's own page, which is where a franchise is read
 * in full — its timeline, its makers, its shelves — and which nothing else on the Omnibus leads to
 * but a name.
 *
 * Beside the yearbook, from `md` up, the wall is three franchises by three filling the height the
 * yearbook's tiles set, so the pair ends level; with the page's width to itself it stands two rows
 * of as many as fit. The worded cut opens every franchise fullscreen, as every cut list in the app does.
 */
const TopFranchises = ({ items, measure }: { items: OmniItem[]; measure: Measure }) => {
  const cards = topFranchises(items, measure);
  const [boxRef, boxWidth] = useElementWidth<HTMLDivElement>();
  const phone = usePhone();
  const paired = !useStackedCharts();
  const perRow = paired ? FILL_PER_ROW : tilesPerRow(boxWidth, phone);
  // Read once for the wall rather than per card, the dialog drawing a hundred and more of them.
  const pages = useContext(FranchisePageContext);
  const rows = paired ? FILL_ROWS : ROWS_SHOWN;
  const shown = perRow * rows;

  return (
    <ExpandableCard
      title="Top franchises"
      sx={paired ? CARD_FILL_SX : undefined}
      expandable={cards.length > shown}
      cutLabel={all(cards.length)}
      renderContent={(isDialog, toggle) => {
        // The dialog draws the biggest franchises at their own height, as many to a row as fit,
        // stating the cut its budget makes where the library holds more.
        const fill = paired && !isDialog;
        const drawn = cards.slice(0, isDialog ? DIALOG_FRANCHISES : shown);
        return (
          <>
            <SectionHeader
              icon={<Stars />}
              title="Top franchises"
              count={isDialog && cards.length > drawn.length ? cut(drawn.length, cards.length) : undefined}
              action={toggle}
              compactActions
            />
            <CardContent sx={fill ? CONTENT_FILL_SX : undefined}>
              <Box
                ref={isDialog ? undefined : boxRef}
                sx={fill ? BOX_FILL_SX : undefined}
              >
                <Box
                  {...CARD_LIST}
                  sx={fill ? fillGridSx(perRow, rows) : TILE_GRID_SX}
                >
                  {drawn.map((card) => (
                    <FranchiseTile
                      key={card.franchise}
                      card={card}
                      measure={measure}
                      fill={fill}
                      open={() => pages.open(card.franchise)}
                    />
                  ))}
                </Box>
              </Box>
            </CardContent>
          </>
        );
      }}
    />
  );
};

/** The wall standing in its box at a stated number of rows, each row an equal share of the height. */
const fillGridSx = (perRow: number, rows: number) => ({
  position: "absolute",
  inset: 0,
  display: "grid",
  gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`,
  gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
  gap: `${TILE_GAP}px`,
});

/** One franchise: its newest works, then its name, figure, years and entries by medium. */
const FranchiseTile = ({
  card,
  measure,
  fill,
  open,
}: {
  card: FranchiseCard;
  measure: Measure;
  fill: boolean;
  open: () => void;
}) => {
  const years = card.from === card.to ? `${card.from}` : `${card.from}–${card.to}`;

  return (
    <Stack
      spacing={0.5}
      // A size container, so the strip can cap its height at a share of the card's own width.
      sx={TILE_SX}
    >
      <Box sx={fill ? STRIP_FILL_SX : STRIP_SX}>
        {franchiseWorks(card.entries)
          .slice(0, PICTURES_PER_FRANCHISE)
          .map((work) => (
            <PictureCell
              key={work.key}
              medium={work.medium}
              item={work}
              // The whole card leads to the franchise, its pictures included: what pressing a
              // franchise's card asks for is the franchise.
              onOpen={open}
              openLabel={`Open ${card.franchise}`}
              sx={STRIP_CELL_SX}
            />
          ))}
      </Box>
      <Typography
        variant="subtitle2"
        noWrap
      >
        <FranchiseLink franchise={card.franchise} />
      </Typography>
      {/* The figure and the years each whole, so a phone's narrow card breaks between them rather
          than cutting the years short. */}
      <Typography
        variant="body2"
        sx={MUTED_FIGURE_SX}
      >
        <Box
          component="span"
          sx={NOWRAP_SX}
        >
          {stated(card.figure, measure.toLowerCase())} ·
        </Box>{" "}
        <Box
          component="span"
          sx={NOWRAP_SX}
        >
          {years}
        </Box>
      </Typography>
      <MediumFigures
        figures={card.media.map(({ medium, entries }) => ({
          medium,
          text: format(entries),
          label: mediumUnit(medium, entries),
        }))}
        sx={FIGURES_SX}
      />
    </Stack>
  );
};

export default TopFranchises;

import { PhotoLibrary } from "@mui/icons-material";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { byDate, type FinishedDensity, type FinishedLayout } from "../common/finishedData";
import { CURRENT_PLAINDATE } from "../common/date";
import { DrilldownDialog } from "../common/DrilldownDialog";
import { Filmstrip } from "../common/Filmstrip";
import { WALL_SX } from "../common/wallSx";
import { SectionHeader } from "../common/SectionHeader";
import { useSelectBox } from "../common/SelectBoxHook";
import { CutButton, SegmentedControl } from "../common/SelectionComponents";
import type { MediaBand } from "../common/Card";
import type { OmniItem } from "../common/medium";
import { all, stated } from "../common/population";
import { segments } from "../common/segments";
import { MUTED_FIGURE_SX } from "../common/typography";
import { useScheme } from "../common/useScheme";
import OmniCardMediaImage from "../app/CardMediaImage";
import { MIXED_CARD_SIZING, workLabels } from "../app/cardData";
import { MEDIUM_LABEL_HEIGHT } from "../app/MediumLabel";
import { MediumDot } from "../app/MediaCounts";
import { mediumBand, pictureMediumBand } from "../app/mediumBand";
import type { ShelfItem } from "../app/galleryData";
import { mediumUnit } from "../utils/types";
import { franchiseShelves, newestFirst, SHELVINGS, type FranchiseShelf } from "./franchiseData";
import "../utils/arrayUtils";

/** How many pictures stand on a shelf before its cut, the gallery's own figure. */
const PICTURES_SHOWN = 20;

/** A shelf scrolled sideways, or every shelf's pictures wrapped down the page: the tabs' own two. */
const LAYOUTS = segments<FinishedLayout>(["Shelves", "Wall"]);

/** How tall a picture stands, which is the one dimension a row of mixed shapes fixes. */
const DENSITIES = segments<FinishedDensity>(["Compact", "Large", "Full"]);
const PICTURE_HEIGHTS: Record<FinishedDensity, number> = { Compact: 100, Large: 150, Full: 240 };

/** The order a shelf's works stand in. */
const ORDERS = ["shelf", "oldest", "newest"] as const;
type Order = (typeof ORDERS)[number];
const ORDER_LABELS: Record<Order, string> = { shelf: "Series order", oldest: "Oldest first", newest: "Newest first" };

/**
 * A shelf's works in the order asked for: as shelved — a series by its own numbers, any other shelf
 * by when its works were begun — or by when each was last met, either way round.
 */
const ordered = (items: ShelfItem[], order: Order) =>
  order === "shelf"
    ? items
    : order === "newest"
      ? newestFirst(items)
      : items.toSorted((a, b) => byDate(a.metDate, b.metDate));

/** What a shelf says of itself beside its name: how many works, over which years, and how it scored. */
const shelfFacts = (shelf: FranchiseShelf) => {
  const years = shelf.items.map((item) => item.metDate.year);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const scored = shelf.items.flatMap((item) => (item.score === undefined ? [] : [item.score]));
  return [
    // A shelf of one medium counts in that medium's own word, so a show's line reads in seasons.
    shelf.medium
      ? mediumUnit(shelf.medium, shelf.items.length)
      : stated(shelf.items.length, shelf.items.length === 1 ? "work" : "works"),
    first === last ? String(first) : `${first}–${String(last).slice(2)}`,
    scored.length ? `avg ${(scored.sum() / scored.length).toFixed(1)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
};

/**
 * The franchise's works on shelves, every work the reader met with a picture, and a series in its
 * own order.
 *
 * Shelved by series it reads as the franchise is made: each numbered line of two or more works on
 * a shelf of its own — a show's seasons are its line — in the order they were met, and every
 * standalone work together at the foot. By medium or by year it is the gallery's own reading of
 * the same works. The controls are the tabs' own library's: shelves scrolled sideways or a wall
 * wrapped down the page, three sizes of picture, and the order a shelf stands in.
 */
const FranchiseLibrary = ({ items }: { items: OmniItem[] }) => {
  const scheme = useScheme();
  const band = mediumBand(scheme);
  const pictureBand = pictureMediumBand(scheme);
  const [shelving, shelvingPicker] = useSelectBox(SHELVINGS, "series", "Shelve by");
  const [order, orderPicker] = useSelectBox(ORDERS, "shelf", "Order", (option) => ORDER_LABELS[option]);
  const [layout, setLayout] = useState<FinishedLayout>("Shelves");
  const [density, setDensity] = useState<FinishedDensity>("Large");
  // The shelf by key rather than as it stood when pressed, so the order and the shelving reach the
  // dialog while it is open.
  const [openedKey, setOpenedKey] = useState<string | null>(null);
  // Shelved apart from ordered, so changing the order rearranges the shelves without building them again.
  const shelved = franchiseShelves(items, shelving, CURRENT_PLAINDATE);
  const shelves = shelved.map((shelf) => ({ ...shelf, items: ordered(shelf.items, order) }));
  const works = shelves.reduce((sum, shelf) => sum + shelf.items.length, 0);
  const height = PICTURE_HEIGHTS[density];
  const opened = shelves.find((shelf) => shelf.key === openedKey);

  return (
    <Card>
      <SectionHeader
        icon={<PhotoLibrary />}
        title="Library"
        count={`${stated(works, works === 1 ? "work" : "works")} on ${stated(shelves.length, shelves.length === 1 ? "shelf" : "shelves")}`}
        action={
          <>
            {shelvingPicker}
            <SegmentedControl
              options={LAYOUTS}
              value={layout}
              onChange={setLayout}
              ariaLabel="Layout"
            />
            <SegmentedControl
              options={DENSITIES}
              value={density}
              onChange={setDensity}
              ariaLabel="Size"
            />
            {orderPicker}
          </>
        }
      />
      <CardContent>
        {layout === "Wall" ? (
          // One flow with nothing between its runs, as every tab's wall is: the shelves' own order
          // carries the grouping, and a heading between each would cut the wall back into shelves.
          <Box sx={WALL_SX}>
            {shelves.flatMap((shelf) =>
              shelf.items.map((item) => (
                <Picture
                  key={`${shelf.key}-${item.key}`}
                  item={item}
                  band={pictureBand}
                  height={height}
                />
              )),
            )}
          </Box>
        ) : (
          <Stack spacing={2}>
            {shelves.map((shelf) => (
              <Shelf
                key={shelf.key}
                shelf={shelf}
                band={pictureBand}
                height={height}
                onOpen={() => setOpenedKey(shelf.key)}
              />
            ))}
          </Stack>
        )}
      </CardContent>
      {opened && (
        <DrilldownDialog
          title={opened.name}
          onClose={() => setOpenedKey(null)}
          content={opened.items}
          cardKey={(item) => `shelf-${item.key}`}
          labelComponent={workLabels}
          band={band}
          rowSizing={MIXED_CARD_SIZING}
          MediaComponent={OmniCardMediaImage}
        />
      )}
    </Card>
  );
};

/**
 * One shelf: its name and what it holds, then its first twenty pictures scrolled sideways and the
 * worded cut to the rest.
 */
const Shelf = ({
  shelf,
  band,
  height,
  onOpen,
}: {
  shelf: FranchiseShelf;
  band: MediaBand<OmniItem>;
  height: number;
  onOpen: () => void;
}) => {
  const scheme = useScheme();
  const pictures = shelf.items.slice(0, PICTURES_SHOWN).map((item) => (
    <Picture
      key={item.key}
      item={item}
      band={band}
      height={height}
    />
  ));

  return (
    <Stack spacing={0.5}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center" }}
      >
        {shelf.medium && (
          <MediumDot
            medium={shelf.medium}
            scheme={scheme}
          />
        )}
        <Typography
          variant="subtitle2"
          noWrap
        >
          {shelf.name}
        </Typography>
        <Typography
          variant="body2"
          sx={{ ...MUTED_FIGURE_SX, flexGrow: 1 }}
        >
          {shelfFacts(shelf)}
        </Typography>
        {shelf.items.length > PICTURES_SHOWN && (
          <CutButton
            label={all(shelf.items.length)}
            onClick={onOpen}
          />
        )}
      </Stack>
      <Filmstrip height={height + MEDIUM_LABEL_HEIGHT}>{pictures}</Filmstrip>
    </Stack>
  );
};

/**
 * One work at the row's height and its own width, its medium named as the gallery's are: across the
 * top of a banner, and down the left of a poster or a cover, which then takes the band's height as
 * well.
 */
const Picture = ({ item, band, height }: { item: ShelfItem; band: MediaBand<OmniItem>; height: number }) => {
  const side = band.side?.(item) ?? "top";

  return (
    <OmniCardMediaImage
      item={item}
      lazy
      mediaBand={{ node: band.render(item), height: band.height, side }}
      sx={{ height: side === "start" ? height + band.height : height, width: "auto" }}
    />
  );
};

export default FranchiseLibrary;

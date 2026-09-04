import { ExpandCircleDown, PhotoLibrary } from "@mui/icons-material";
import { CardContent, IconButton, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { INLINE_SWATCH_SIZE, Swatch } from "../common/Card";
import { CURRENT_PLAINDATE } from "../common/date";
import { DrilldownDialog } from "../common/DrilldownDialog";
import { FILMSTRIP_HEIGHT, Filmstrip } from "../common/Filmstrip";
import { SectionHeader } from "../common/SectionHeader";
import { useSelectBox } from "../common/SelectBoxHook";
import { SegmentedControl, type SegmentOption } from "../common/SelectionComponents";
import { EXPANDED_CARDS, ExpandableCard } from "../common/Stats";
import { format } from "../utils/mathUtils";
import type { OmniItem } from "./adapter";
import OmniCardMediaImage from "./CardMediaImage";
import { MIXED_CARD_SIZING, omniLabels } from "./cardData";
import { MEDIUM_LABEL_HEIGHT } from "./MediumLabel";
import { mediumBand } from "./mediumBand";
import {
  GALLERY_CATEGORIES,
  GALLERY_SORTS,
  galleryColour,
  galleryGroups,
  type GalleryCategory,
  type GallerySort,
  type Shelf as ShelfGroup,
} from "./galleryData";
import type { Measure } from "./types";
import { MUTED_FIGURE_SX } from "../common/typography";
import { useScheme } from "../common/useScheme";

/**
 * How many shelves the section draws, and how many pictures stand on one before the rest are left
 * to the drill-down.
 *
 * The shelves are ordered by size, so the cut falls where a shelf stops carrying much of the
 * library; the header states the full count, the way the crossings section does, so the cut is
 * visible rather than silent. A shelf's own cut is what keeps a scroll of six strips to a few
 * dozen pictures rather than the whole union laid out sideways.
 */
const SHELVES_SHOWN = 6;
const PICTURES_SHOWN = 20;

/**
 * How many shelves the fullscreen view draws.
 *
 * Derived from the picture budget rather than picked, because a shelf is twenty cards and it is
 * cards that cost: expanded, this holds the same number of them a drill-down dialog does. Grouping
 * by franchise yields 115 shelves against 12 genres, so a view that simply dropped the cap would
 * mount over two thousand cards on one of the four categories and none of the others.
 */
const SHELVES_EXPANDED = Math.floor(EXPANDED_CARDS / PICTURES_SHOWN);

/**
 * How a sort reads. Segments rather than a second select: the barchart directly above this card
 * switches its own four views the same way, and two dropdowns side by side in one header read as
 * one compound setting rather than two independent ones. The words are what the keys are not —
 * `size` and `recent` name the field, where the reader is choosing between biggest and newest.
 */
const sortLabels: Record<GallerySort, string> = {
  size: "Largest",
  recent: "Recent",
};

const sortOptions: SegmentOption<GallerySort>[] = GALLERY_SORTS.map((sort) => ({
  value: sort,
  label: sortLabels[sort],
}));

/** How a category reads in the header, where the field name alone would mean the other thing. */
const categoryTitles: Record<GalleryCategory, string> = {
  genre: "Genre",
  franchise: "Franchise",
  rating: "Rating",
  // Not the decade it was made in — shows carry no release date — so the header says which decade
  // it means rather than letting the reader assume the home tabs' sense of the word.
  decade: "Decade Met",
};

/**
 * The library as pictures: a shelf per group, each a row of artwork at one height.
 *
 * The walls this is assembled from do not agree on a shape — banners on the Games and Movies
 * tabs, posters on Shows, covers on Books — so the mixing is the whole point of the surface, and
 * nothing is cropped to hide it. A picture opens its own tab's expanded card; the shelf's own handle opens the
 * whole shelf, and the section's opens the shelves the collapsed card had no room for.
 */
const Gallery = ({ data, measure }: { data: OmniItem[]; measure: Measure }) => {
  const scheme = useScheme();
  const band = mediumBand(scheme);

  // Opens on franchises, newest first: the series met lately, which is the question this wall
  // answers that the genre band above it does not, and the one order the tab's own Recently
  // Finished list does not already give.
  const [category, controls] = useSelectBox(GALLERY_CATEGORIES, "franchise");
  const [sort, setSort] = useState<GallerySort>("recent");
  const [drilldown, setDrilldown] = useState<ShelfGroup | null>(null);

  const groups = galleryGroups(data, category, measure, sort, CURRENT_PLAINDATE);
  const title = categoryTitles[category];

  // Built in the card's own render rather than inside `renderContent`, which `ExpandableCard` calls
  // again on each of its own state changes — opening the dialog, closing it, and unmounting its
  // body are three, and a shelf is twenty cards. Here the compiler caches the array on what it is
  // derived from, so those three commits re-render no shelf at all; built in the callback, every
  // element is new each time and nothing can bail. `setDrilldown` is passed rather than an arrow
  // closing over each group, since one fresh handler per shelf would defeat the same cache.
  const shelves = groups.map((group) => (
    <Shelf
      key={`${category}-${group.name}`}
      group={group}
      category={category}
      measure={measure}
      onOpen={setDrilldown}
    />
  ));

  return (
    <>
      <ExpandableCard
        expandable={groups.length > SHELVES_SHOWN}
        renderContent={(isDialog, toggle) => {
          // Answered once and shared, so the header states the cut the wall actually makes.
          const limit = isDialog ? SHELVES_EXPANDED : SHELVES_SHOWN;
          const shown = Math.min(groups.length, limit);

          return (
            <>
              <SectionHeader
                icon={<PhotoLibrary />}
                title={`Shelves by ${title}`}
                count={shown < groups.length ? `${format(shown)} of ${format(groups.length)}` : format(groups.length)}
                action={
                  <Stack
                    direction="row"
                    sx={{ alignItems: "center" }}
                  >
                    {controls}
                    <SegmentedControl
                      options={sortOptions}
                      value={sort}
                      onChange={setSort}
                      ariaLabel="Shelf order"
                    />
                    {toggle}
                  </Stack>
                }
              />
              <CardContent>
                <Stack spacing={2}>{shelves.slice(0, limit)}</Stack>
              </CardContent>
            </>
          );
        }}
      />
      {/* Mounted only while a shelf is picked, so the full list is never built behind a closed
          dialog — a shelf can hold several hundred items where the strip shows twenty. */}
      {drilldown && (
        <DrilldownDialog
          title={`${title} · ${drilldown.name}`}
          onClose={() => setDrilldown(null)}
          content={drilldown.all}
          cardKey={(item) => `${category}-${item.key}`}
          labelComponent={omniLabels}
          band={band}
          // One card size for a shelf's mixed shapes, as Recently Finished sizes its run.
          rowSizing={MIXED_CARD_SIZING}
          MediaComponent={OmniCardMediaImage}
        />
      )}
    </>
  );
};

/**
 * One shelf: what it is called and how much of the library is on it, then the pictures.
 *
 * The name carries a swatch only where the app paints that field elsewhere: a genre, a
 * certificate and a decade always, a franchise where the shared table holds it.
 */
const Shelf = ({
  group,
  category,
  measure,
  onOpen,
}: {
  group: ShelfGroup;
  category: GalleryCategory;
  measure: Measure;
  /** Takes the shelf rather than closing over it, so the caller can pass its setter unwrapped. */
  onOpen: (group: ShelfGroup) => void;
}) => {
  const scheme = useScheme();
  const band = mediumBand(scheme);

  const colour = galleryColour(group.name, category, scheme);

  return (
    <Stack spacing={0.5}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center" }}
      >
        {colour && (
          <Swatch
            colour={colour}
            size={INLINE_SWATCH_SIZE}
          />
        )}
        <Typography
          variant="subtitle2"
          noWrap
        >
          {group.name}
        </Typography>
        <Typography
          variant="body2"
          sx={{ ...MUTED_FIGURE_SX, flexGrow: 1 }}
        >
          {`${format(group.count)} ${measure}`}
        </Typography>
        <IconButton
          size="small"
          onClick={() => onOpen(group)}
          aria-label={`Open ${group.name}`}
        >
          <ExpandCircleDown color="action" />
        </IconButton>
      </Stack>
      <Filmstrip height={FILMSTRIP_HEIGHT + MEDIUM_LABEL_HEIGHT}>
        {group.all.slice(0, PICTURES_SHOWN).map((item) => (
          <OmniCardMediaImage
            key={item.key}
            item={item}
            lazy
            // The band along the top rather than a footer, so a card here reads the way one in the
            // drill-down does. With no words beside or beneath it the card is arranged by nothing,
            // and the picture keeps the whole of the height the shelf gives it below the band.
            mediaBand={{ node: band.render(item), height: band.height }}
            // The shelf fixes the height and each picture keeps its own width, so a banner and a
            // poster stand at one height in the shapes they were made in.
            sx={{ height: FILMSTRIP_HEIGHT, width: "auto" }}
          />
        ))}
      </Filmstrip>
    </Stack>
  );
};

export default Gallery;

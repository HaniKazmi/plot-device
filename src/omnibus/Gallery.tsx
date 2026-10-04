import { Collections, PhotoLibrary } from "@mui/icons-material";
import { Box, CardContent, Stack, Typography } from "@mui/material";
import { useRef, useState } from "react";
import { INLINE_SWATCH_SIZE, Swatch } from "../common/Swatch";
import { CURRENT_PLAINDATE } from "../common/date";
import { DrilldownDialog } from "../common/DrilldownDialog";
import { FILMSTRIP_HEIGHT, Filmstrip } from "../common/Filmstrip";
import { WALL_SX } from "../common/wallSx";
import { SectionHeader } from "../common/SectionHeader";
import { useSelectBox } from "../common/SelectBoxHook";
import { CutButton, SegmentedControl, type SegmentOption } from "../common/SelectionComponents";
import { EXPANDED_CARDS, ExpandableCard } from "../common/Stats";
import { all, cut, stated } from "../common/population";
import { segments } from "../common/segments";
import { cardsOf, franchiseGroup, type FinishedCard, type FinishedLayout } from "../common/finishedData";
import type { MediaBand } from "../common/Card";
import { BucketHeading } from "../common/Finished";
import { ScrollMarker, ScrollMarkerRail } from "../common/ScrollMarker";
import { useScrollMarker } from "../common/ScrollMarkerHook";
import { usePhone } from "../common/breakpoints";
import type { OmniItem } from "../common/medium";
import OmniCardMediaImage from "../app/CardMediaImage";
import { MIXED_CARD_SIZING, workLabels } from "../app/cardData";
import { MEDIUM_LABEL_HEIGHT } from "../app/MediumLabel";
import { mediumBand } from "../app/mediumBand";
import {
  GALLERY_CATEGORIES,
  GALLERY_SORTS,
  galleryColour,
  galleryGroups,
  type GalleryCategory,
  type GallerySort,
  type Shelf as ShelfGroup,
  type ShelfItem,
} from "../app/galleryData";
import type { Measure } from "../app/types";
import { MUTED_FIGURE_SX } from "../common/typography";
import { format } from "../utils/mathUtils";
import { useScheme } from "../common/useScheme";

/**
 * How many shelves the section draws, and how many pictures stand on one before the rest are left
 * to the drill-down.
 *
 * The shelves are ordered by size, so the cut falls where a shelf stops carrying much of the
 * library; the header states the full count, the way the crossings section does, so the cut is
 * visible rather than silent. A shelf's own cut is what keeps a scroll of six strips to a few
 * dozen pictures rather than the whole union laid out sideways. The wall has neither cut: it is the
 * library read end to end, as every tab's wall is.
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

/** How a category reads in the picker, where the field name alone would mean the other thing. */
const categoryTitles: Record<GalleryCategory, string> = {
  franchise: "Franchise",
  when: "When",
  genre: "Genre",
  medium: "Medium",
  certificate: "Certificate",
  // Not the decade it was made in — shows carry no release date — so the picker says which decade
  // it means rather than letting the reader assume the home tabs' sense of the word.
  decade: "Decade Met",
};

/** The library's two layouts, the four tabs' own: rows that scroll sideways, or rows that wrap. */
const LAYOUT_OPTIONS = segments<FinishedLayout>(["Shelves", "Wall"]);

/**
 * One card per work, or per franchise: the second count the library offers, as every tab's does.
 * Not offered while the shelves are franchises themselves, where every card on a shelf is of one.
 */
type Per = "work" | "franchise";

const PER_OPTIONS: SegmentOption<Per>[] = [
  { value: "work", label: "Works" },
  { value: "franchise", label: "Franchises" },
];

/** What the drill-down lists: a whole shelf, or the works one franchise card on it stands for. */
interface Opened {
  title: string;
  items: ShelfItem[];
}

/** A shelf's cards: one per work, or one per franchise on it. */
interface Run {
  group: ShelfGroup;
  cards: FinishedCard<ShelfItem>[];
}

/** What the scroll marker is told the wall holds while the shelves stand in its place. */
const NO_RUNS: readonly never[] = [];

/** The height every picture stands at, shelf or wall: the artwork and the medium band above it. */
const ROW_HEIGHT = FILMSTRIP_HEIGHT + MEDIUM_LABEL_HEIGHT;

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
  const [category, controls] = useSelectBox(GALLERY_CATEGORIES, "franchise", "Shelve by", (key) => categoryTitles[key]);
  const [sort, setSort] = useState<GallerySort>("recent");
  // Shelves on this tab, where every other tab's library opens on its wall: these shelves are the
  // tab's own gallery, and a union of four libraries is shelves before it is a wall.
  const [layout, setLayout] = useState<FinishedLayout>("Shelves");
  const [per, setPer] = useState<Per>("work");
  const [drilldown, setDrilldown] = useState<Opened | null>(null);

  const groups = galleryGroups(data, category, measure, sort, CURRENT_PLAINDATE);
  const title = categoryTitles[category];
  const byFranchise = per === "franchise" && category !== "franchise";
  const openShelf = (group: ShelfGroup) => setDrilldown({ title: `${title} · ${group.name}`, items: group.all });
  const openCard = (group: ShelfGroup, card: FinishedCard<ShelfItem>) =>
    setDrilldown({ title: `${title} · ${group.name} · ${card.item.franchise}`, items: [...card.members] });

  // Every shelf's cards, cut once for both layouts, so a shelf and its run of the wall cannot
  // disagree about what stands on it.
  const runs: Run[] = groups.map((group) => ({
    group,
    cards: cardsOf(group.all, byFranchise ? franchiseGroup : undefined),
  }));
  const wall = layout === "Wall";

  // The wall is the tallest thing on the page, so where a reader is in it is the marker's to say,
  // as it is on every tab's wall: a pill naming the run from `sm` up, or a rail of them where the
  // gutter holds one. A phone has no gutter, and the runs name themselves in the flow instead.
  const phone = usePhone();
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const marker = useScrollMarker(sectionRef, gridRef, `${category}-${sort}`, wall ? runs : NO_RUNS);

  // Built in the card's own render rather than inside `renderContent`, which `ExpandableCard` calls
  // again on each of its own state changes — opening the dialog, closing it, and unmounting its
  // body are three, and a shelf is twenty cards. Here the compiler caches the array on what it is
  // derived from, so those three commits re-render no shelf at all; built in the callback, every
  // element is new each time and nothing can bail.
  const shelves = runs.map(({ group, cards }) => (
    <Shelf
      key={`${category}-${group.name}`}
      group={group}
      cards={cards}
      category={category}
      measure={measure}
      band={band}
      // A year is a run read whole — what was finished in it — so under When each shelf wraps its
      // every work under the year's name, where a genre or a franchise shelf is read by its first
      // screen and scrolls, as every tab's library does.
      wrap={category === "when"}
      onOpen={openShelf}
      onOpenCard={(card) => openCard(group, card)}
    />
  ));
  // The wall's pictures in one flow, each carrying the run it stands in for the marker to read. A
  // work stands once a run, so its key with the run's name is unique across the wall even where a
  // grouping puts it on two. Built only under the wall, a union's worth of cards drawing nothing on
  // the shelves.
  const wallPictures =
    wall &&
    runs.flatMap(({ group, cards }) =>
      cards.map((card) => (
        <Box
          key={`${group.name}-${card.item.key}`}
          data-bucket={group.name}
        >
          <ShelfPicture
            card={card}
            band={band}
            onOpenCard={(opened) => openCard(group, opened)}
          />
        </Box>
      )),
    );

  return (
    <>
      <ExpandableCard
        title="Library"
        // The shelves left off, as the control that draws them; the wall cuts nothing, so its
        // control is the plain ⤢ every wall wears.
        expandable={wall || groups.length > SHELVES_SHOWN}
        cutLabel={wall ? undefined : all(groups.length)}
        // A sticky heading is positioned against the nearest scrolling ancestor, and a card's own
        // clipping makes the card that ancestor, so it is opened where the headings are drawn.
        sx={{ overflow: { xs: "visible", sm: "hidden" } }}
        renderContent={(isDialog, toggle) => {
          // Answered once and shared, so the header states the cut the shelves actually make.
          const limit = isDialog ? SHELVES_EXPANDED : SHELVES_SHOWN;
          const shown = Math.min(groups.length, limit);

          return (
            <Box ref={isDialog ? undefined : sectionRef}>
              <SectionHeader
                icon={<PhotoLibrary />}
                title="Library"
                count={!wall && isDialog && shown < groups.length ? cut(shown, groups.length) : undefined}
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
                    <SegmentedControl
                      options={LAYOUT_OPTIONS}
                      value={layout}
                      onChange={setLayout}
                      ariaLabel="Layout"
                    />
                    {category !== "franchise" && (
                      <SegmentedControl
                        options={PER_OPTIONS}
                        value={per}
                        onChange={setPer}
                        ariaLabel="One card per"
                      />
                    )}
                    {toggle}
                  </Stack>
                }
              />
              <CardContent>
                {!wall ? (
                  <Stack spacing={2}>{shelves.slice(0, limit)}</Stack>
                ) : phone ? (
                  <Stack spacing={1}>
                    {runs.map(({ group, cards }) => (
                      <Box key={`${category}-${group.name}`}>
                        <BucketHeading
                          label={group.name}
                          count={cards.length}
                          isDialog={isDialog}
                          swatch={galleryColour(group.name, category, scheme)}
                        />
                        <Box sx={WALL_SX}>
                          {cards.map((card) => (
                            <ShelfPicture
                              key={card.item.key}
                              card={card}
                              band={band}
                              onOpenCard={(opened) => openCard(group, opened)}
                            />
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Box
                    ref={isDialog ? undefined : gridRef}
                    sx={WALL_SX}
                  >
                    {wallPictures}
                  </Box>
                )}
              </CardContent>
              {/* Nothing between the runs from `sm` up, as every tab's wall: the marker names the
                  run the reader is in, and the rail of them jumps between runs where it fits. */}
              {!isDialog &&
                !phone &&
                wall &&
                runs.length > 0 &&
                (marker.rail ? <ScrollMarkerRail {...marker} /> : <ScrollMarker {...marker} />)}
            </Box>
          );
        }}
      />
      {/* Mounted only while a shelf is picked, so the full list is never built behind a closed
          dialog — a shelf can hold several hundred items where the strip shows twenty. */}
      {drilldown && (
        <DrilldownDialog
          title={drilldown.title}
          onClose={() => setDrilldown(null)}
          content={drilldown.items}
          cardKey={(item) => `${category}-${item.key}`}
          labelComponent={workLabels}
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
 * One picture, shelf or wall: the work's own card at the row's height, a franchise card opening its
 * works rather than the one whose picture fronts it and saying in its corner how many it stands for.
 */
const ShelfPicture = ({
  card,
  band,
  onOpenCard,
}: {
  card: FinishedCard<ShelfItem>;
  /** Built once by the gallery, which draws a union's worth of these. */
  band: MediaBand<OmniItem>;
  onOpenCard: (card: FinishedCard<ShelfItem>) => void;
}) => {
  const grouped = card.members.length > 1;

  return (
    <OmniCardMediaImage
      item={card.item}
      lazy
      // The band along the top rather than a footer, so a card here reads the way one in the
      // drill-down does. With no words beside or beneath it the card is arranged by nothing, and
      // the picture keeps the whole of the height the row gives it below the band.
      mediaBand={{ node: band.render(card.item), height: band.height }}
      // The row fixes the height and each picture keeps its own width, so a banner and a poster
      // stand at one height in the shapes they were made in; the card reserves that width from
      // its medium's shape before the artwork arrives, which is what a wall's offsets are read in.
      sx={{ height: FILMSTRIP_HEIGHT, width: "auto" }}
      chip={grouped ? { label: format(card.members.length), icon: <Collections /> } : undefined}
      onOpen={grouped ? () => onOpenCard(card) : undefined}
      openLabel={grouped ? `Open ${card.item.franchise}, ${stated(card.members.length, "works")}` : undefined}
    />
  );
};

/**
 * One shelf: what it is called and how much of the library is on it, then its first twenty
 * pictures scrolled sideways and the worded cut to the rest — or, wrapped, every picture on it.
 *
 * The name carries a swatch only where the app paints that field elsewhere: a genre, a
 * certificate, a decade and a medium always, a franchise where the shared table holds it.
 */
const Shelf = ({
  group,
  cards,
  category,
  measure,
  band,
  wrap,
  onOpen,
  onOpenCard,
}: {
  group: ShelfGroup;
  /** The shelf's works as the cards drawn — one each, or one per franchise. */
  cards: FinishedCard<ShelfItem>[];
  category: GalleryCategory;
  measure: Measure;
  band: MediaBand<OmniItem>;
  /** Every card wrapped at the row's height rather than the first twenty scrolled. */
  wrap: boolean;
  /** Takes the shelf rather than closing over it, so the caller can pass its handler unwrapped. */
  onOpen: (group: ShelfGroup) => void;
  onOpenCard: (card: FinishedCard<ShelfItem>) => void;
}) => {
  const scheme = useScheme();
  const colour = galleryColour(group.name, category, scheme);
  const pictures = (wrap ? cards : cards.slice(0, PICTURES_SHOWN)).map((card) => (
    <ShelfPicture
      key={card.item.key}
      card={card}
      band={band}
      onOpenCard={onOpenCard}
    />
  ));

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
          {stated(group.count, measure)}
        </Typography>
        {/* The shelf's own cut, worded: the strip shows twenty pictures of a shelf that can hold
            hundreds, and the figure is what says so as well as what opens the rest. A chevron in a
            circle says only "more", in the glyph the card's own expand means a different verb by. */}
        {!wrap && (
          <CutButton
            label={all(group.all.length)}
            onClick={() => onOpen(group)}
          />
        )}
      </Stack>
      {wrap ? <Box sx={WALL_SX}>{pictures}</Box> : <Filmstrip height={ROW_HEIGHT}>{pictures}</Filmstrip>}
    </Stack>
  );
};

export default Gallery;

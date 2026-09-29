import { Box, Card, CardContent, Dialog, Stack, Typography, type SxProps, type Theme } from "@mui/material";
import { usePhone } from "./breakpoints";
import { CutButton, SegmentedControl } from "./SelectionComponents";
import { segments } from "./segments";
import Grid from "@mui/material/Grid";
import { Collections, GridView } from "@mui/icons-material";
import { useDeferredValue, useRef, useState, type ReactNode, type RefObject } from "react";
import { type TypedCardMediaImage } from "./Card";
import { INLINE_SWATCH_SIZE, Swatch } from "./Swatch";
import { ColourKey } from "./ColourKey";
import { colourKeyEntries } from "./colourKeyData";
import { NothingMatches } from "./NothingMatches";
import { useNothingMatches } from "./nothingMatchesContext";
import { SectionHeader } from "./SectionHeader";
import { useSelectBox } from "./SelectBoxHook";
import { ScrollMarker, ScrollMarkerRail } from "./ScrollMarker";
import { useScrollMarker } from "./ScrollMarkerHook";
import { ExpandableCard } from "./Stats";
import { Filmstrip, STRIP_GAP } from "./Filmstrip";
import { SheetBar } from "./SheetBar";
import { all, stated } from "./population";
import {
  bucketFor,
  bucketGroups,
  cardRuns,
  endDateOf,
  finishedColumns,
  finishedItems,
  finishedKey,
  FINISHED_SORTS,
  wordSort,
  type CloseOf,
  type FinishedBucketGroup,
  type FinishedCard,
  type FinishedDensity,
  type FinishedExtraSort,
  type FinishedItem,
  type FinishedLayout,
  type FinishedUnit,
} from "./finishedData";
import { withAlpha } from "../utils/colourUtils";
import { shapeToAspect, shapeToRatio } from "./cardArrangement";
import { PHONE_SCROLL_MARGIN_CSS } from "./SectionRail";
import { SHEET_HEADER_BOTTOM } from "./fullscreenSheet";
import { MUTED_FIGURE_SX, NUMERIC_LABEL_SX } from "./typography";
import { format } from "../utils/mathUtils";

/** One empty list, so a wall with no extra sorts does not mint a fresh array every render. */
const NO_SORTS: readonly never[] = [];

/** What the marker is told the wall holds while the shelves stand in its place: no cards at all. */
const NO_CARDS: readonly never[] = [];

/**
 * The densities as the segmented control's options. Words rather than icons: the three differ in
 * size alone, and a picture of a size is a picture of a grid either way, where "Compact", "Large"
 * and "Full" say it outright.
 */
const DENSITY_OPTIONS = segments<FinishedDensity>(["Compact", "Large", "Full"]);

const LAYOUT_OPTIONS = segments<FinishedLayout>(["Shelves", "Wall"]);

/**
 * How many pictures a shelf stands before the rest are left to its cut, the gallery's own figure:
 * a shelf is read by its first screen or two, and a run can hold hundreds.
 */
const SHELF_PICTURES = 20;

/**
 * How tall a shelf's artwork stands at each size, on a phone and above it.
 *
 * A shelf fixes the height and lets each picture keep its width, so the size a reader picks is a
 * height rather than a column count. Compact and Large are the wall's own card at that size: in a
 * 1,728px window a compact banner is 230px wide on the wall and 213 on its shelf, a large one 473
 * against 462. Full is where the two part: a wall card a row is 1,448px wide and 815 tall, taller
 * than the window, where a shelf is read along its row, so Full is the largest picture a row of
 * them still reads as a row at: a banner 711px wide, two of them to the row's width.
 */
const SHELF_HEIGHTS: Record<FinishedDensity, { phone: number; wide: number }> = {
  Compact: { phone: 96, wide: 120 },
  Large: { phone: 150, wide: 260 },
  Full: { phone: 190, wide: 400 },
};

/** The border every card wears, wall or shelf, in the vocabulary the key under the header names. */
const BORDER_WIDTH = 3;

const borderSx = (fill: string | undefined) => ({
  borderColor: fill && withAlpha(fill, "90"),
  borderStyle: fill && "solid",
  borderWidth: fill && BORDER_WIDTH,
});

/**
 * The height every card holds before its artwork arrives.
 *
 * A lazily loaded image reserves nothing, so a wall of them stands at a fifth of its real height —
 * 7,000 pixels against 33,000 for 322 games — and every offset measured in it is short by the
 * artwork that has not loaded yet. Scrolling into the wall is what makes that artwork load, so the
 * page grows under the reader and a position measured a moment ago is already wrong; a jump far
 * down the sort asks for an offset the document does not yet have and lands clamped at its bottom
 * instead.
 *
 * A landscape wall pins 16:9 outright and crops a file that is not: a banner a few pixels off its
 * shape would otherwise stand its row a few pixels taller or shorter than its neighbours, and the
 * wall reads as one grid only while every card is one height. A portrait wall holds covers as well
 * as posters, and no cover is any exact ratio, so there `shapeToAspect`'s leading `auto` keeps the
 * figure a reservation the file's own shape replaces once it is known. On a shelf the same rule
 * reserves a width instead, the height being the shelf's.
 */
const artworkSx = (landscape: boolean) =>
  landscape ? { aspectRatio: shapeToRatio("banner"), objectFit: "cover" } : { aspectRatio: shapeToAspect("poster") };

/**
 * One card, wall or shelf, bordered in the tab's vocabulary.
 *
 * A card standing for a group opens the group rather than the item whose picture it wears — the
 * picture fronts the group, so the press has that one meaning — and says in its corner how many it
 * stands for, the one thing its picture cannot. Its accessible name is the group's, since the
 * picture's `alt` names the one member pressing it does not open.
 */
const WallCard = <U,>({
  card,
  colour,
  landscape,
  artworkSx: sx,
  cardSx,
  unit,
  onOpenGroup,
  MediaComponent,
}: {
  card: FinishedCard<U>;
  colour?: (item: U) => string;
  landscape: boolean;
  artworkSx: SxProps<Theme>;
  cardSx?: SxProps<Theme>;
  unit?: FinishedUnit<U>;
  onOpenGroup: (card: FinishedCard<U>) => void;
  MediaComponent: TypedCardMediaImage<U>;
}) => {
  const grouped = card.members.length > 1;
  return (
    <Card sx={{ ...cardSx, ...borderSx(colour?.(card.item)) }}>
      <MediaComponent
        item={card.item}
        landscape={landscape}
        lazy
        sx={sx}
        chip={grouped ? { label: format(card.members.length), icon: <Collections /> } : undefined}
        onOpen={grouped ? () => onOpenGroup(card) : undefined}
        openLabel={
          grouped && unit
            ? `Open ${unit.of(card.item)}, ${stated(card.members.length, unit.labels[0].toLowerCase())}`
            : undefined
        }
      />
    </Card>
  );
};

/** The wall's own card fills its grid cell, which the scroll marker reads a row by. */
const WALL_CARD_SX = { height: "100%" } as const;

/**
 * The wall itself, as a component rather than as JSX inside `Finished`'s `renderContent`.
 *
 * The boundary is what keeps the wall off the scroll path. `renderContent` is called again on
 * every render of the card, and the marker changes state on a bucket crossing and on every jump —
 * so a wall built inside it is a thousand cards with fresh `sx` objects and fresh closures each
 * time a reader scrolls past a year. Built here, the compiler caches the rows on what they are
 * derived from, and a marker change re-renders nothing below this line. `omnibus/Gallery.tsx`
 * builds its shelves in its own body for the same reason; the difference is that these rows read
 * `isDialog`, so the cache has to belong to each of the two mountings rather than to one array
 * shared between them.
 */
const FinishedGrid = <U extends FinishedItem>({
  isDialog,
  gridRef,
  dimmed,
  cards,
  sort,
  sorts,
  closeOf,
  density,
  colour,
  landscape,
  keyOf,
  unit,
  onOpenGroup,
  MediaComponent,
}: {
  isDialog: boolean;
  gridRef?: RefObject<HTMLDivElement | null>;
  /** The deferred value is lagging the filter, and the trade is worth making visible. */
  dimmed: boolean;
  cards: readonly FinishedCard<U>[];
  sort: string;
  sorts: readonly FinishedExtraSort<U>[];
  closeOf: CloseOf<U>;
  density: FinishedDensity;
  colour?: (item: U) => string;
  landscape: boolean;
  keyOf: (item: U) => string;
  unit?: FinishedUnit<U>;
  onOpenGroup: (card: FinishedCard<U>) => void;
  MediaComponent: TypedCardMediaImage<U>;
}) => {
  // Resolved once for the wall rather than once per card: the sort is the same for all of them.
  const bucket = bucketFor<U>(sort, sorts, closeOf);
  return (
    <Grid
      container
      ref={gridRef}
      spacing={1}
      sx={{
        opacity: dimmed ? 0.5 : 1,
      }}
    >
      {cards.map((card) => (
        <Grid
          key={`${keyOf(card.item)}-${isDialog ? "dialog" : "card"}`}
          // Written at render from the same item and sort the order came from, so the marker
          // reads a position off the DOM instead of keeping a parallel list to index into.
          data-bucket={bucket(card.item) ?? undefined}
          size={finishedColumns(landscape, density)}
          sx={{
            // The card ends where its picture does rather than at the row's height. Only a cover
            // is ever short of it — its ratio is a reservation and every publisher's file is a few
            // percent off 2:3 — and stretched, that difference is a band of the card's own ground
            // inside the border, which reads as a card drawn wrong rather than as a picture that
            // came out shorter. The tops stay level either way, which is what the scroll marker
            // reads a row by.
            alignSelf: "flex-start",
          }}
        >
          <WallCard
            card={card}
            colour={colour}
            landscape={landscape}
            artworkSx={artworkSx(landscape)}
            cardSx={WALL_CARD_SX}
            unit={unit}
            onOpenGroup={onOpenGroup}
            MediaComponent={MediaComponent}
          />
        </Grid>
      ))}
    </Grid>
  );
};

/**
 * A bucket's own heading, pinned under whatever is above it while its cards are on screen.
 *
 * It is the jump rail's derivation drawn in the flow rather than beside it: on a phone the page has
 * no gutter to hang a rail in and no room for a pill that is not over the cards it names, and a
 * sticky heading is what every list on the platform indexes itself with. On the page it clears
 * nothing but the screen's own edge and whatever the device reserves above it — `viewport-fit=cover`
 * lays the page out to the physical top, so on a notched phone an unpadded heading pins under the
 * sensor housing — the rail at this width being drawn in the bar along the bottom;
 * in the dialog it clears the sheet's own close bar, which is pinned in the scrollport this heading
 * sticks in, and a heading pinned at 0 parks behind it.
 *
 * The ground and the stacking order are both load-bearing: artwork arrives while the reader is
 * inside the wall, and a transparent heading has a card sliding under it and a picture landing over
 * it.
 */
export const BucketHeading = ({
  label,
  count,
  isDialog,
  swatch,
}: {
  label: string;
  count: number;
  isDialog: boolean;
  /** The run's own colour, where it is a value the tab paints elsewhere. */
  swatch?: string;
}) => (
  <Box
    sx={{
      position: "sticky",
      top: isDialog ? SHEET_HEADER_BOTTOM : PHONE_SCROLL_MARGIN_CSS,
      zIndex: 1,
      display: "flex",
      alignItems: "baseline",
      gap: 1,
      paddingY: 0.5,
      backgroundColor: "background.paper",
    }}
  >
    {swatch && (
      <Swatch
        colour={swatch}
        size={INLINE_SWATCH_SIZE}
      />
    )}
    <Typography
      variant="subtitle2"
      sx={NUMERIC_LABEL_SX}
    >
      {label}
    </Typography>
    <Typography
      variant="caption"
      sx={MUTED_FIGURE_SX}
    >
      {format(count)}
    </Typography>
  </Box>
);

/**
 * A run wrapped rather than scrolled: every card at the shelf's height and its own width, row after
 * row, which is a wall with the run's name standing over it.
 */
const SHELF_WRAP_SX = { display: "flex", flexWrap: "wrap", gap: `${STRIP_GAP}px` } as const;

/**
 * One run of the library as a shelf: its name, how many it holds, and a row of its pictures that
 * scrolls sideways.
 *
 * The gallery's shelf, over one tab's cards: each picture at the shelf's height and its own width,
 * bordered as it is on the wall, so a card reads the same whichever way the library is laid out.
 * Twenty pictures stand on it and the rest are one press away behind the worded cut, which carries
 * the run's size — so the figure beside the name is drawn only where there is no cut to state it.
 */
const FinishedShelf = <U extends FinishedItem>({
  group,
  swatch,
  height,
  colour,
  landscape,
  keyOf,
  isDialog,
  wrap,
  onOpen,
  unit,
  onOpenGroup,
  MediaComponent,
}: {
  group: FinishedBucketGroup<FinishedCard<U>>;
  swatch?: string;
  /** The whole run wrapped at the shelf's height rather than its first twenty scrolled. */
  wrap: boolean;
  /** The artwork's height; the border is added outside it. */
  height: number;
  colour?: (item: U) => string;
  landscape: boolean;
  keyOf: (item: U) => string;
  isDialog: boolean;
  /** Takes the run rather than closing over it, so the caller can pass its setter unwrapped. */
  onOpen: (group: FinishedBucketGroup<FinishedCard<U>>) => void;
  unit?: FinishedUnit<U>;
  onOpenGroup: (card: FinishedCard<U>) => void;
  MediaComponent: TypedCardMediaImage<U>;
}) => {
  const cut = !wrap && group.items.length > SHELF_PICTURES;
  const border = colour ? 2 * BORDER_WIDTH : 0;
  const cards = (wrap ? group.items : group.items.slice(0, SHELF_PICTURES)).map((card) => (
    <WallCard
      key={`${keyOf(card.item)}-${isDialog ? "dialog" : "card"}`}
      card={card}
      colour={colour}
      landscape={landscape}
      artworkSx={{ ...artworkSx(landscape), height, width: "auto" }}
      unit={unit}
      onOpenGroup={onOpenGroup}
      MediaComponent={MediaComponent}
    />
  ));
  return (
    <Stack spacing={0.5}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", minHeight: 28 }}
      >
        {swatch && (
          <Swatch
            colour={swatch}
            size={INLINE_SWATCH_SIZE}
          />
        )}
        <Typography
          variant="subtitle2"
          noWrap
          sx={NUMERIC_LABEL_SX}
        >
          {group.label}
        </Typography>
        <Typography
          variant="body2"
          sx={{ ...MUTED_FIGURE_SX, flexGrow: 1 }}
        >
          {cut ? null : format(group.items.length)}
        </Typography>
        {cut && (
          <CutButton
            label={all(group.items.length)}
            onClick={() => onOpen(group)}
          />
        )}
      </Stack>
      {wrap ? <Box sx={SHELF_WRAP_SX}>{cards}</Box> : <Filmstrip height={height + border}>{cards}</Filmstrip>}
    </Stack>
  );
};

const Finished = <U extends FinishedItem>({
  title,
  count,
  border,
  data,
  colour,
  landscape: landscapeProp,
  keyOf: keyOfProp,
  sorts: sortsProp,
  closeOf: closeOfProp,
  unit,
  MediaComponent,
}: {
  title: string;
  /** What the grid is over, in the caller's own words. Optional: a domain may have no noun yet. */
  count?: string;
  /**
   * What the card border is coloured by: the field in the caller's own words — "platform",
   * "status", "genre" — and how to read that field off an item, which is what lets the key below
   * the header name each colour. The wall draws a border on every card whichever domain it is, and
   * with nothing naming the values a reader has no way to tell a colour means something from a
   * colour that is just decoration.
   */
  border?: { key: string; valueOf: (item: U) => string };
  data: readonly U[];
  colour?: (item: U) => string;
  landscape?: boolean;
  /**
   * What tells one card from another, where the title and release year do not: a book read twice
   * is two rows with both the same, and two cards under one key are dropped or swapped by React
   * with nothing on screen to say so. Left off, a card is keyed the way the wall sorts it.
   */
  keyOf?: (item: U) => string;
  /** Orders over the domain's own words and figures, offered after the two every wall has. */
  sorts?: readonly FinishedExtraSort<U>[];
  /** When an item was finished, where that is not its end date; see `CloseOf`. */
  closeOf?: CloseOf<U>;
  /** A second count the library offers, one card per group; none, and it offers only its items. */
  unit?: FinishedUnit<U>;
  MediaComponent: TypedCardMediaImage<U>;
}) => {
  // Applied after the pattern: a default inside it bails the component out of the React Compiler.
  const landscape = landscapeProp ?? false;
  const keyOf = keyOfProp ?? finishedKey;
  const sorts: readonly FinishedExtraSort<U>[] = sortsProp ?? NO_SORTS;
  const closeOf: CloseOf<U> = closeOfProp ?? endDateOf;
  // A programming error, thrown rather than resolved: the built-in would answer for the wall and
  // the extra for the marker, or the reverse, with nothing on screen to say so.
  const shadowed = sorts.find((extra) => (FINISHED_SORTS as readonly string[]).includes(extra.label));
  if (shadowed) throw new Error(`A wall sort cannot be named "${shadowed.label}": that order is built in`);
  const sortOptions: readonly string[] = [...FINISHED_SORTS, ...sorts.map((extra) => extra.label)];
  // "Shelve by" under both layouts: the runs are what the wall's jump chips and headings name and
  // what the shelves are, so the one control says what a run is either way.
  const [sort, selectBox] = useSelectBox<string>(sortOptions, "When", "Shelve by");
  // Held for the visit, as the size is: the library is the tallest thing on its page, and a stored
  // layout would have to be read before the first paint to avoid changing it under the reader.
  const [layout, setLayout] = useState<FinishedLayout>("Wall");
  // The run whose cut was pressed, its whole wall drawn in a dialog of its own. Mounted only while
  // one is picked, so a run of hundreds is never built behind a closed dialog.
  const [shelf, setShelf] = useState<FinishedBucketGroup<FinishedCard<U>> | null>(null);
  // Whether a card stands for an item or for its group, opening on the item: the library's own
  // noun is what the page counts in, and the groups are a reading of it.
  const [per, setPer] = useState<"item" | "group">("item");
  const grouped = per === "group";
  // The group whose card was pressed, its members drawn in a dialog above whatever opened it.
  const [bundle, setBundle] = useState<FinishedCard<U> | null>(null);
  const shelving = wordSort(sort, sorts);
  // Derived here rather than inside `renderContent`, which is called for the card and again for
  // the dialog and on each of that dialog's own state changes: this walks the whole library.
  const keyEntries = border ? colourKeyEntries(data, border.valueOf, colour) : [];
  // The wall is what the page's height is, so this has to be the true answer on the first render:
  // read wrong, every card would mount at one density and remount at another, asking for each
  // picture twice over. `usePhone` is that answer, stated once for the app.
  const phone = usePhone();
  // Each view opens at its own size and holds the reader's choice for the visit rather than
  // writing it anywhere: the wall is the tallest thing on its page, so the size it opens at is
  // what the page is, and a stored preference would have to be read before the first paint to
  // avoid changing it underneath them. The page opens on Large, a card at the size the hero draws
  // one; the dialog opens on Full, the wall read one item at a time, which is what expanding it
  // asks for.
  //
  // A phone opens on Compact instead: Large there is one banner a row, and 322 games at 220px each
  // is seventy thousand pixels of page with nothing but a picture on each screen. Held as "not yet
  // chosen" rather than seeded from the width, so the default follows a rotation until the reader
  // has an opinion, after which it is theirs.
  const [density, setDensity] = useState<FinishedDensity | undefined>(undefined);
  const [dialogDensity, setDialogDensity] = useState<FinishedDensity>("Full");
  const shownDensity = density ?? (phone ? "Compact" : "Large");

  const slowData = useDeferredValue(data, []);
  const recent = finishedItems(slowData, sort, sorts, closeOf);
  // Cut once for every surface that draws runs — the phone's headings, the shelves and the cut's
  // dialog — so a shelf and a heading cannot disagree about where a card stands.
  const runs = cardRuns(bucketGroups(recent, sort, sorts, closeOf), grouped ? unit?.of : undefined);
  // The desktop wall is the runs laid end to end, so a card stands where its run puts it.
  const cards = runs.flatMap((run) => run.items);
  const { active: nothing } = useNothingMatches();

  // The marker measures and queries the page itself, so it holds the two elements it reads rather
  // than a copy of what they contain. Both are the inline grid's: the dialog renders the same
  // content fullscreen, and a second set of cards answering the same query would give the marker
  // two walls to choose between.
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  // Only the wall has one grid for the marker to read. Handed a list of its own under the shelves,
  // the marker re-reads the wall's cards when the reader comes back to it, which a ref alone cannot
  // tell it: the grid it measured is gone and a new one stands in its place.
  const marker = useScrollMarker(sectionRef, gridRef, sort, layout === "Wall" ? cards : NO_CARDS);

  const renderContent = (isDialog: boolean, toggle: ReactNode) => {
    // The wall, whether it is drawn whole or a bucket at a time: everything but which cards and
    // which element the marker measures is the same either way, and stating it twice is two lists
    // of ten props that can come apart.
    const grid = (items: readonly FinishedCard<U>[], ref?: RefObject<HTMLDivElement | null>) => (
      <FinishedGrid
        isDialog={isDialog}
        gridRef={ref}
        dimmed={slowData !== data}
        cards={items}
        sort={sort}
        sorts={sorts}
        closeOf={closeOf}
        density={isDialog ? dialogDensity : shownDensity}
        colour={colour}
        landscape={landscape}
        keyOf={keyOf}
        unit={unit}
        onOpenGroup={setBundle}
        MediaComponent={MediaComponent}
      />
    );

    return (
      <Box ref={isDialog ? undefined : sectionRef}>
        <SectionHeader
          icon={<GridView />}
          title={title}
          count={count}
          action={
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center" }}
            >
              {selectBox}
              <SegmentedControl
                options={LAYOUT_OPTIONS}
                value={layout}
                onChange={setLayout}
                ariaLabel="Layout"
              />
              {unit && (
                <SegmentedControl
                  options={[
                    { value: "item", label: unit.labels[0] },
                    { value: "group", label: unit.labels[1] },
                  ]}
                  value={per}
                  onChange={setPer}
                  ariaLabel="One card per"
                />
              )}
              <SegmentedControl
                options={DENSITY_OPTIONS}
                value={isDialog ? dialogDensity : shownDensity}
                onChange={isDialog ? setDialogDensity : setDensity}
                ariaLabel="Card size"
              />
              {toggle}
            </Stack>
          }
        />
        {border && keyEntries.length > 0 && (
          <ColourKey
            field={border.key}
            entries={keyEntries}
          />
        )}
        <CardContent>
          {recent.length === 0 && nothing ? (
            <NothingMatches />
          ) : layout === "Shelves" ? (
            <Stack spacing={2}>
              {runs.map((group, index) => (
                <FinishedShelf
                  // The position as well as the label, for the reason the headings below give.
                  key={`${sort}-${group.label}-${index}`}
                  group={group}
                  swatch={shelving?.colour?.(group.label)}
                  height={SHELF_HEIGHTS[isDialog ? dialogDensity : shownDensity][phone ? "phone" : "wide"]}
                  colour={colour}
                  landscape={landscape}
                  keyOf={keyOf}
                  isDialog={isDialog}
                  // A year is a run read whole — what was finished in it — and a bounded one, 63 at
                  // most on any tab (Books, 2003), where a genre or a franchise's initial runs to a
                  // hundred or more and is read by its first screen. So When wraps each year's whole
                  // run under its name, and every other order keeps the scrolling strip and its cut.
                  wrap={sort === "When"}
                  onOpen={setShelf}
                  unit={unit}
                  onOpenGroup={setBundle}
                  MediaComponent={MediaComponent}
                />
              ))}
            </Stack>
          ) : phone ? (
            <Stack spacing={1}>
              {/* The position as well as the label: a sort that returns to a bucket it has passed
                opens a second run under the same heading, and two of them keyed alike would have
                React render one in place of the other. */}
              {runs.map((group, index) => (
                <Box key={`${group.label}-${index}`}>
                  <BucketHeading
                    label={group.label}
                    count={group.items.length}
                    isDialog={isDialog}
                    swatch={shelving?.colour?.(group.label)}
                  />
                  {grid(group.items)}
                </Box>
              ))}
            </Stack>
          ) : (
            grid(cards, isDialog ? undefined : gridRef)
          )}
        </CardContent>
        {/* Two presentations of one derivation: the rail where the gutter and the viewport hold it,
          the pill everywhere else. Which one is the hook's answer, so they cannot both appear.
          Neither is mounted on a phone, where the wall carries its own headings instead. Nothing
          on an empty wall to mark a position in. */}
        {!isDialog &&
          !phone &&
          layout === "Wall" &&
          cards.length > 0 &&
          (marker.rail ? <ScrollMarkerRail {...marker} /> : <ScrollMarker {...marker} />)}
      </Box>
    );
  };

  /** A run or a group opened as a whole wall of its own, over the page. */
  const wallDialog = (
    name: string,
    cards: readonly FinishedCard<U>[],
    onClose: () => void,
    groups?: FinishedUnit<U>,
  ) => (
    <Dialog
      open
      fullScreen
      onClose={onClose}
    >
      <SheetBar
        title={`${title} · ${name}`}
        onClose={onClose}
      />
      <CardContent>
        <FinishedGrid
          isDialog
          dimmed={false}
          cards={cards}
          sort={sort}
          sorts={sorts}
          closeOf={closeOf}
          density={shownDensity}
          colour={colour}
          landscape={landscape}
          keyOf={keyOf}
          unit={groups}
          onOpenGroup={setBundle}
          MediaComponent={MediaComponent}
        />
      </CardContent>
    </Dialog>
  );

  return (
    // A sticky heading is positioned against the nearest scrolling ancestor, and MUI clips a card's
    // corners with `overflow: hidden`, which makes the card itself that ancestor: the headings
    // would then stand still inside a box that never scrolls. Opened only where they are drawn —
    // the wall's own content stops well inside the card's corners, so there is nothing to clip.
    <>
      <ExpandableCard
        title={title}
        sx={{ overflow: { xs: "visible", sm: "hidden" } }}
        renderContent={renderContent}
      />
      {shelf && wallDialog(shelf.label, shelf.items, () => setShelf(null), unit)}
      {/* After the shelf's own dialog, so a group opened from inside a shelf stands above it. */}
      {bundle &&
        wallDialog(
          unit?.of(bundle.item) ?? bundle.item.name,
          bundle.members.map((item) => ({ item, members: [item] })),
          () => setBundle(null),
        )}
    </>
  );
};

export default Finished;

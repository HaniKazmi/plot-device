import { Box, Card, CardContent, FormGroup, Stack } from "@mui/material";
import Grid from "@mui/material/Grid";
import { GridView } from "@mui/icons-material";
import { useDeferredValue, useRef, type ReactNode, type RefObject } from "react";
import type { TypedCardMediaImage } from "./Card";
import { SectionHeader } from "./SectionHeader";
import { useSelectBox } from "./SelectBoxHook";
import { ScrollMarker, ScrollMarkerRail } from "./ScrollMarker";
import { useScrollMarker } from "./ScrollMarkerHook";
import { ExpandableCard } from "./Stats";
import { finishedBucket, finishedItems, finishedKey, type FinishedItem, type FinishedSort } from "./finishedData";
import { withAlpha } from "../utils/colourUtils";
import { shapeToAspect } from "./cardArrangement";

const sortOptions: FinishedSort[] = ["Date", "Franchise"];

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
  recent,
  sort,
  width,
  colour,
  landscape,
  keyOf,
  MediaComponent,
}: {
  isDialog: boolean;
  gridRef?: RefObject<HTMLDivElement | null>;
  /** The deferred value is lagging the filter, and the trade is worth making visible. */
  dimmed: boolean;
  recent: readonly U[];
  sort: FinishedSort;
  width: number;
  colour?: (item: U) => string;
  landscape: boolean;
  keyOf: (item: U) => string;
  MediaComponent: TypedCardMediaImage<U>;
}) => (
  <Grid
    container
    ref={gridRef}
    spacing={1}
    sx={{
      alignItems: "center",
      opacity: dimmed ? 0.5 : 1,
    }}
  >
    {recent.map((item) => (
      <Grid
        key={`${keyOf(item)}-${isDialog ? "dialog" : "card"}`}
        // Written at render from the same item and sort the order came from, so the marker
        // reads a position off the DOM instead of keeping a parallel list to index into.
        data-bucket={finishedBucket(item, sort) ?? undefined}
        size={isDialog ? 12 : width}
        sx={{
          alignSelf: "stretch",
        }}
      >
        <Card
          sx={{
            height: "100%",
            borderColor: colour && withAlpha(colour(item), "90"),
            borderStyle: colour && "solid",
            borderWidth: colour && 3,
          }}
        >
          <MediaComponent
            item={item}
            landscape={landscape}
            lazy
            /**
             * The height every card holds before its artwork arrives.
             *
             * A lazily loaded image reserves nothing, so a wall of them stands at a fifth of its
             * real height — 7,000 pixels against 33,000 for 322 games — and every offset measured
             * in it is short by the artwork that has not loaded yet. Scrolling into the wall is
             * what makes that artwork load, so the page grows under the reader and a position
             * measured a moment ago is already wrong; a jump far down the sort asks for an offset
             * the document does not yet have and lands clamped at its bottom instead.
             *
             * `shapeToAspect` prefixes the ratio with `auto`, which is what keeps this a
             * reservation rather than a crop: the artwork's own shape wins the moment it is
             * known, and the declared figure stands in only while there is none. What is left to
             * settle after one lands is a card's own rounding rather than a card's height,
             * because every file is authored to the shape it declares.
             */
            sx={{ aspectRatio: shapeToAspect(landscape ? "landscape" : "portrait") }}
          />
        </Card>
      </Grid>
    ))}
  </Grid>
);

const Finished = <U extends FinishedItem>({
  title,
  count,
  data,
  width,
  colour,
  landscape: landscapeProp,
  keyOf: keyOfProp,
  MediaComponent,
}: {
  title: string;
  /** What the grid is over, in the caller's own words. Optional: a domain may have no noun yet. */
  count?: string;
  data: readonly U[];
  width: number;
  colour?: (item: U) => string;
  landscape?: boolean;
  /**
   * What tells one card from another, where the title and release year do not: a book read twice
   * is two rows with both the same, and two cards under one key are dropped or swapped by React
   * with nothing on screen to say so. Left off, a card is keyed the way the wall sorts it.
   */
  keyOf?: (item: U) => string;
  MediaComponent: TypedCardMediaImage<U>;
}) => {
  // Applied after the pattern: a default inside it bails the component out of the React Compiler.
  const landscape = landscapeProp ?? false;
  const keyOf = keyOfProp ?? finishedKey;
  const [sort, selectBox] = useSelectBox(sortOptions, "Date");

  const slowData = useDeferredValue(data, []);
  const recent = finishedItems(slowData, sort);

  // The marker measures and queries the page itself, so it holds the two elements it reads rather
  // than a copy of what they contain. Both are the inline grid's: the dialog renders the same
  // content fullscreen, and a second set of cards answering the same query would give the marker
  // two walls to choose between.
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const marker = useScrollMarker(sectionRef, gridRef, sort, slowData);

  const renderContent = (isDialog: boolean, toggle: ReactNode) => (
    <Box ref={isDialog ? undefined : sectionRef}>
      <SectionHeader
        icon={<GridView />}
        title={title}
        count={count}
        action={
          <FormGroup>
            <Stack
              direction={"row"}
              spacing={1}
            >
              {selectBox}
              {toggle}
            </Stack>
          </FormGroup>
        }
      />
      <CardContent>
        <FinishedGrid
          isDialog={isDialog}
          gridRef={isDialog ? undefined : gridRef}
          dimmed={slowData !== data}
          recent={recent}
          sort={sort}
          width={width}
          colour={colour}
          landscape={landscape}
          keyOf={keyOf}
          MediaComponent={MediaComponent}
        />
      </CardContent>
      {/* Two presentations of one derivation: the rail where the gutter and the viewport hold it,
          the pill everywhere else. Which one is the hook's answer, so they cannot both appear. */}
      {!isDialog && (marker.rail ? <ScrollMarkerRail {...marker} /> : <ScrollMarker {...marker} />)}
    </Box>
  );

  return <ExpandableCard renderContent={renderContent} />;
};

export default Finished;

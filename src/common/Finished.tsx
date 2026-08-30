import { Box, Card, CardContent, FormGroup, Stack } from "@mui/material";
import Grid from "@mui/material/Grid";
import { GridView } from "@mui/icons-material";
import { useDeferredValue, useRef, type ReactNode } from "react";
import type { TypedCardMediaImage } from "./Card";
import { SectionHeader } from "./SectionHeader";
import { useSelectBox } from "./SelectBoxHook";
import { ScrollMarker } from "./ScrollMarker";
import { useScrollMarker } from "./ScrollMarkerHook";
import { ExpandableCard } from "./Stats";
import { finishedBucket, finishedItems, type FinishedItem, type FinishedSort } from "./finishedData";
import { withAlpha } from "../utils/colourUtils";

const sortOptions: FinishedSort[] = ["Date", "Name"];

const Finished = <U extends FinishedItem>({
  title,
  count,
  data,
  width,
  colour,
  landscape = false,
  MediaComponent,
}: {
  title: string;
  /** What the grid is over, in the caller's own words. Optional: a domain may have no noun yet. */
  count?: string;
  data: readonly U[];
  width: number;
  colour?: (item: U) => string;
  landscape?: boolean;
  MediaComponent: TypedCardMediaImage<U>;
}) => {
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
        <Grid
          container
          ref={isDialog ? undefined : gridRef}
          spacing={1}
          sx={{
            alignItems: "center",
            opacity: slowData !== data ? 0.5 : 1,
          }}
        >
          {recent.map((item) => (
            <Grid
              key={`${item.name}-${isDialog ? "dialog" : "card"}`}
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
                />
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
      {!isDialog && <ScrollMarker {...marker} />}
    </Box>
  );

  return <ExpandableCard renderContent={renderContent} />;
};

export default Finished;

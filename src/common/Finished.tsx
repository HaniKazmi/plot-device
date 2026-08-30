import { Card, CardContent, FormGroup, Stack } from "@mui/material";
import Grid from "@mui/material/Grid";
import { GridView } from "@mui/icons-material";
import { useDeferredValue, type ReactNode } from "react";
import type { TypedCardMediaImage } from "./Card";
import { SectionHeader } from "./SectionHeader";
import { useSelectBox } from "./SelectBoxHook";
import { ExpandableCard } from "./Stats";
import { finishedItems, type FinishedItem, type FinishedSort } from "./finishedData";
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
  const renderContent = (isDialog: boolean, toggle: ReactNode) => (
    <>
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
          spacing={1}
          sx={{
            alignItems: "center",
            opacity: slowData !== data ? 0.5 : 1,
          }}
        >
          {recent.map((item) => (
            <Grid
              key={`${item.name}-${isDialog ? "dialog" : "card"}`}
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
    </>
  );

  return <ExpandableCard renderContent={renderContent} />;
};

export default Finished;

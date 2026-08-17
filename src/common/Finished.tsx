import { Card, CardHeader, CardContent, FormGroup, Dialog, Stack, IconButton } from "@mui/material";
import Grid from "@mui/material/Grid";
import { useDeferredValue, useState } from "react";
import type { TypedCardMediaImage } from "./Card";
import { useSelectBox } from "./SelectBoxHook";
import { CloseFullscreen, Fullscreen } from "@mui/icons-material";
import { finishedItems, type FinishedItem, type FinishedSort } from "./finishedData";
import { withAlpha } from "../utils/colourUtils";

const sortOptions: FinishedSort[] = ["Date", "Name"];

const Finished = <U extends FinishedItem>({
  title,
  data,
  width,
  colour,
  landscape = false,
  MediaComponent,
}: {
  title: string;
  data: readonly U[];
  width: number;
  colour?: (item: U) => string;
  landscape?: boolean;
  MediaComponent: TypedCardMediaImage<U>;
}) => {
  const [sort, selectBox] = useSelectBox(sortOptions, "Date");

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  /** Lags `dialogOpen` on close so the grid survives the dialog's exit transition. */
  const [dialogMounted, setDialogMounted] = useState<boolean>(false);

  const slowData = useDeferredValue(data, []);
  const recent = finishedItems(slowData, sort);
  const renderContent = (isDialog: boolean) => (
    <>
      <CardHeader
        title={title}
        action={
          <FormGroup>
            <Stack
              direction={"row"}
              spacing={1}
            >
              {selectBox}
              <IconButton
                onClick={() => {
                  setDialogOpen(!isDialog);
                  if (!isDialog) setDialogMounted(true);
                }}
              >
                {isDialog ? <CloseFullscreen color="primary" /> : <Fullscreen />}
              </IconButton>
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

  return (
    <Card>
      {renderContent(false)}
      <Dialog
        open={dialogOpen}
        fullScreen
        slotProps={{ transition: { onExited: () => setDialogMounted(false) } }}
      >
        {dialogMounted && renderContent(true)}
      </Dialog>
    </Card>
  );
};

export default Finished;

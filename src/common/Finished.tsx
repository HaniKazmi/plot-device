import { Card, CardHeader, CardContent, FormGroup, Dialog, Stack, IconButton } from "@mui/material";
import Grid from "@mui/material/Grid";
import { useDeferredValue, useState } from "react";
import type { TypedCardMediaImage } from "./Card";
import { useSelectBox } from "./SelectBoxHook";
import { CloseFullscreen, Fullscreen } from "@mui/icons-material";
import type { Year, YearMonthDay } from "./date";

const Finished = <
  U extends {
    banner?: string;
    startDate?: YearMonthDay | Year | Date;
    endDate?: YearMonthDay | Year | Date;
    name: string;
  },
>({
  title,
  data,
  width,
  colour,
  MediaComponent,
}: {
  title: string;
  data: readonly U[];
  width: number;
  colour?: (item: U) => string;
  MediaComponent: TypedCardMediaImage<U>;
}) => {
  const options: ("Date" | "Name")[] = ["Date", "Name"];
  const [sort, selectBox] = useSelectBox(options, "Date");

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const slowData = useDeferredValue(data, []);
  let recent = slowData.filter((show) => show.banner);
  if (sort === "Date") {
    recent = recent.sortByKey("startDate", false);
  }
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
              <IconButton onClick={() => setDialogOpen(!isDialog)}>
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
              key={`${item.name}-${isDialog ? 'dialog' : 'card'}`}
              size={isDialog ? 12 : width}
              sx={{
                alignSelf: "stretch",
              }}
            >
              <Card
                sx={{
                  height: "100%",
                  borderColor: colour && colour(item) + 90,
                  borderStyle: colour && "solid",
                  borderWidth: colour && 3,
                }}
              >
                <MediaComponent
                  item={item}
                  landscape={"format" in item}
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
      >
        {renderContent(true)}
      </Dialog>
    </Card>
  );
};

export default Finished;

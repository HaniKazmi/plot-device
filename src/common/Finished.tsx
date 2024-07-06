import { Card, CardHeader, CardContent, FormGroup, FormControlLabel, Switch, Dialog, Stack } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { TypedCardMediaImage } from "./Card";
import { SelectBox } from "../vg/SelectionComponents";


const Finished = <U extends { banner?: string; startDate?: Date; endDate?: Date; name: string }>({
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

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const [sort, setSort] = useState<"Date" | "Name">("Date");

  useEffect(() => setMounted(true), []);
  const EMPTY_ARRAY: U[] = useMemo(() => [], [])
  const slowData = useDeferredValue(mounted ? data : EMPTY_ARRAY);
  const recent = slowData.filter((show) => show.banner);
  if(sort === "Date") {
    recent.sortByKey("startDate");
  }
  const content = (
    <>
      <CardHeader
        title={title}
        action={
          <FormGroup>
            <Stack direction={"row"} spacing={1}>
              <SelectBox
                options={options}
                value={sort}
                setValue={setSort}
              />
              <FormControlLabel
                label="Maximise"
                control={<Switch checked={dialogOpen} onChange={(_, checked) => setDialogOpen(checked)} />}
              />
            </Stack>
          </FormGroup>
        }
      />
      <CardContent>
        <Grid container spacing={1} alignItems="center" sx={{ opacity: slowData !== data ? 0.5 : 1 }}>
          {recent.map((item) => (
            <Grid alignSelf="stretch" key={item.name} xs={dialogOpen ? 12 : width}>
              <Card
                sx={{
                  height: "100%",
                  borderColor: colour && colour(item) + 90,
                  borderStyle: colour && "solid",
                  borderWidth: colour && 3,
                }}
              >
                <MediaComponent item={item} landscape={"format" in item} image={item.banner} height="100%" />
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </>
  );

  return (
    <Card>
      {content}
      <Dialog open={dialogOpen} fullScreen>
        {content}
      </Dialog>
    </Card>
  );
};

export default Finished;

import { Card, CardHeader, CardContent, FormGroup, FormControlLabel, Switch, Dialog } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { TypedCardMediaImage } from "./Card";

const Finished = <U extends { banner?: string; startDate?: Date; name: string }>({
  title,
  data,
  width,
  colour,
  MediaComponent,
}: {
  title: string;
  data: U[];
  width: number;
  colour?: (item: U) => string;
  MediaComponent: TypedCardMediaImage<U>;
}) => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const EMPTY_ARRAY: U[] = useMemo(() => [], [])
  const slowData = useDeferredValue(mounted ? data : EMPTY_ARRAY);
  const recent = slowData.filter((show) => show.banner).sortByKey("startDate");
  const content = (
    <>
      <CardHeader
        title={title}
        action={
          <FormGroup row>
            <FormControlLabel
              label="Maximise"
              control={<Switch checked={dialogOpen} onChange={(_, checked) => setDialogOpen(checked)} />}
            />
          </FormGroup>
        }
      />
      <CardContent>
        <Grid container spacing={1} alignItems="center" sx={{opacity: slowData !==  data ? 0.5 : 1}}>
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

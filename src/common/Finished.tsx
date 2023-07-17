import { Card, CardHeader, CardContent, FormGroup, FormControlLabel, Switch, Dialog } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { useState } from "react";
import { CardMediaImage } from "./Card";

const Finished = ({
  title,
  data,
  width,
}: {
  title: string;
  data: { banner?: string; startDate?: Date; name: string }[];
  width: number;
}) => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const recent = data.filter((show) => show.banner).sortByKey("startDate");
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
        <Grid container spacing={1} alignItems="center">
          {recent.map((item) => (
            <Grid alignSelf="stretch" key={item.name} xs={dialogOpen ? 4 : width}>
              <Card sx={{ height: "100%" }}>
                <CardMediaImage image={item.banner} height="100%" alt={item.name} />
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

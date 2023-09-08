import Stats from "./Stats";
import { Measure, VideoGame, companyToColor } from "./types";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import Finished from "../common/Finished";
import Timeline from "./Timeline";
import { Stack, Typography } from "@mui/material";
import CardMediaImage from "./CardMediaImage";

const Graphs = ({ vgData, measure }: { vgData: VideoGame[]; measure: Measure }) =>
  vgData.length > 0 ? (
    <Stack spacing={2}>
      <Stats data={vgData} />
      <Timeline data={vgData} />
      <Sunburst data={vgData} measure={measure} />
      <Barchart data={vgData} measure={measure} />
      <Finished MediaComponent={CardMediaImage} title="All Games" data={vgData} width={4} colour={companyToColor} />
    </Stack>
  ) : (
    <Typography variant="h1" textAlign="center">No Data Found</Typography>
  );

export default Graphs;

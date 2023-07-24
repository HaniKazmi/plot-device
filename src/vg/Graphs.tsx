import Stats from "./Stats";
import { Measure, VideoGame, companyToColor } from "./types";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import Finished from "../common/Finished";
import Timeline from "./Timeline";
import { Stack } from "@mui/material";

const Graphs = ({ vgData, measure }: { vgData: VideoGame[]; measure: Measure }) => (
  <Stack spacing={2}>
    <Stats data={vgData} />
    <Timeline data={vgData} />
    <Sunburst data={vgData} measure={measure} />
    <Barchart data={vgData} measure={measure} />
    <Finished title="All Games" data={vgData} width={4} colour={(vg: VideoGame) => companyToColor(vg)} />
  </Stack>
);

export default Graphs;

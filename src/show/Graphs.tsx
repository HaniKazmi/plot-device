import { Stack } from "@mui/material";
import Finished from "../common/Finished";
import Barchart from "./Barchart";
import Stats from "./Stats";
import Timeline from "./Timeline";
import { Show } from "./types";
import ShowCardMediaImage from "./CardMediaImage";
import { statusToColour } from "../vg/types";

const Graphs = ({ data }: { data: Show[] }) => (
  <Stack spacing={2}>
    <Stats data={data} />
    <Timeline data={data} />
    <Barchart data={data} measure={"Hours"} />
    <Finished title="All Shows" data={data} width={3} colour={statusToColour} MediaComponent={ShowCardMediaImage} />
  </Stack>
);

export default Graphs;

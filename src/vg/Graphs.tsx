import Stats from "./Stats";
import { VideoGame, companyToColor } from "./types";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import Finished from "../common/Finished";
import Timeline from "./Timeline";
import { Stack, Typography } from "@mui/material";
import CardMediaImage from "./CardMediaImage";
import { FilterDispatch, FilterState } from "./filterUtils";

const Graphs = ({
  vgData,
  filterState,
  filterDispatch,
}: {
  vgData: VideoGame[];
  filterState: FilterState;
  filterDispatch: FilterDispatch;
}) =>
  vgData.length > 0 ? (
    <Stack spacing={2}>
      <Stats data={vgData} yearType={filterState.yearType} yearTo={filterState.yearTo} measure={filterState.measure} filterDispatch={filterDispatch} />
      <Timeline data={vgData} />
      <Sunburst data={vgData} measure={filterState.measure} />
      <Barchart data={vgData} measure={filterState.measure} yearType={filterState.yearType} />
      <Finished MediaComponent={CardMediaImage} title="All Games" data={vgData} width={4} colour={companyToColor} />
    </Stack>
  ) : (
    <Typography variant="h1" textAlign="center">
      No Data Found
    </Typography>
  );

export default Graphs;

import { Fab, Stack } from "@mui/material";
import Finished from "../common/Finished";
import Barchart from "./Barchart";
import Sunburst from "./Sunburst";
import Stats from "./Stats";
import Timeline from "./Timeline";
import { Show } from "./types";
import ShowCardMediaImage from "./CardMediaImage";
import { statusToColour } from "../utils/types";
import type { FilterDispatch, FilterState } from "./filterUtils";
import { Functions, Timer } from "@mui/icons-material";
import { useDeferredValue } from "react";

const Graphs = ({
  data,
  filterState,
  filterDispatch,
}: {
  data: Show[];
  filterState: FilterState;
  filterDispatch: FilterDispatch;
}) => {
  const deferredData = useDeferredValue(data, []);
  return (
    <>
      <Stack spacing={2}>
        <Stats data={data} />
        <Timeline data={deferredData} />
        <Barchart
          data={deferredData}
          measure={filterState.measure}
        />
        <Sunburst
          data={deferredData}
          measure={filterState.measure}
        />
        <Finished
          title="All Shows"
          data={data}
          width={3}
          colour={statusToColour}
          MediaComponent={ShowCardMediaImage}
        />
      </Stack>
      <Stack
        direction="column"
        spacing={2}
        sx={{ position: "fixed", right: (theme) => theme.spacing(2), bottom: (theme) => theme.spacing(2) }}
      >
        <Fab
          color="secondary"
          onClick={() => filterDispatch({ type: "toggleMeasure" })}
        >
          {filterState.measure === "Episodes" ? <Functions /> : <Timer />}
        </Fab>
      </Stack>
    </>
  );
};

export default Graphs;

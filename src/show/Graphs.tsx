import { Fab, Stack } from "@mui/material";
import Finished from "../common/Finished";
import Barchart from "./Barchart";
import Sunburst from "./Sunburst";
import Stats from "./Stats";
import { ChartPair, Section, SectionRail } from "../common/SectionRail";
import { SHOW_SECTIONS, showSections } from "./sections";
import { currentlyWatching } from "./statsData";
import Timeline from "./Timeline";
import { Show } from "./types";
import ShowCardMediaImage from "./CardMediaImage";
import { statusToColour } from "../utils/types";
import type { FilterDispatch, FilterState } from "./filterUtils";
import { Functions, Timer } from "@mui/icons-material";
import { useDeferredValue } from "react";
import { format } from "../utils/mathUtils";
import { finishedCount } from "../common/finishedData";

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
  // Answered once for the page: it decides both whether the "now" strip is rendered and whether
  // the rail offers a chip pointing at it, and two derivations of one test are two that can differ.
  const watching = currentlyWatching(data);

  return (
    <>
      <Stack spacing={2}>
        <SectionRail sections={showSections(watching.length > 0)} />
        <Stats
          data={data}
          watching={watching}
        />
        <Section id={SHOW_SECTIONS.timeline}>
          <Timeline data={deferredData} />
        </Section>
        <Section id={SHOW_SECTIONS.charts}>
          <ChartPair
            left={
              <Sunburst
                data={deferredData}
                measure={filterState.measure}
              />
            }
            right={
              <Barchart
                data={deferredData}
                measure={filterState.measure}
              />
            }
          />
        </Section>
        <Section id={SHOW_SECTIONS.library}>
          <Finished
            title="All Shows"
            count={`${format(finishedCount(data))} shows`}
            data={data}
            width={3}
            colour={statusToColour}
            MediaComponent={ShowCardMediaImage}
          />
        </Section>
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

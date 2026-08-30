import { Fab, Stack } from "@mui/material";
import Grid from "@mui/material/Grid";
import Finished from "../common/Finished";
import Barchart from "./Barchart";
import Sunburst from "./Sunburst";
import Stats from "./Stats";
import { Section, SectionRail } from "../common/SectionRail";
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
          {/* Side by side once there is width for it: the two answer the same question — where
              the hours went — through a hierarchy and through time, and reading one against the
              other is the point of having both. */}
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 12, md: 6 }}>
              <Sunburst
                data={deferredData}
                measure={filterState.measure}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Barchart
                data={deferredData}
                measure={filterState.measure}
              />
            </Grid>
          </Grid>
        </Section>
        <Section id={SHOW_SECTIONS.library}>
          <Finished
            title="All Shows"
            count={`${format(data.length)} shows`}
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

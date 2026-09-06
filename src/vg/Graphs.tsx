import Stats from "./Stats";
import { VideoGame, companyToColor } from "./types";
import { vgModule } from "./module";
import { useScheme } from "../common/useScheme";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import Finished from "../common/Finished";
import Timeline from "./Timeline";
import CardMediaImage from "./CardMediaImage";
import type { FilterState } from "./filterUtils";
import { FranchiseContext, vgFranchise } from "./franchiseContext";
import { franchiseIndex } from "../common/franchiseIndex";
import { memo, useDeferredValue } from "react";
import { Stack } from "@mui/material";
import { usePhone } from "../common/breakpoints";
import { ChartPair, ChartsAndLibrary, Section } from "../common/SectionRail";
import { PageRail } from "../app/PageRail";
import { VG_SECTIONS, vgSections } from "./sections";
import { currentlyPlaying } from "./statsData";
import { wallPopulation } from "../common/finishedData";

/** What the wall's card borders speak, and the key beneath its header names. */
const VG_BORDER = { key: "company", valueOf: (game: VideoGame) => game.company };

const SuspenseBlock = ({
  filteredData,
  unfilteredData,
  filterState,
}: {
  filteredData: VideoGame[];
  unfilteredData: VideoGame[];
  filterState: FilterState;
}) => (
  <FranchiseContext.Provider value={franchiseIndex(unfilteredData, vgFranchise)}>
    <Graphs
      data={filteredData}
      filterState={filterState}
    />
  </FranchiseContext.Provider>
);

const Graphs = memo(({ data, filterState }: { data: VideoGame[]; filterState: FilterState }) => {
  const scheme = useScheme();
  const deferredData = useDeferredValue(data, []);
  // Answered once for the page: it decides both whether the hero is rendered and whether the
  // rail offers a chip pointing at it, and two derivations of one test are two that can differ.
  const playing = currentlyPlaying(data);
  // The phone reads the library before the charts. One answer for the page and the rail alike:
  // `ChartsAndLibrary` orders the two sections and `chartsLastOrder`, inside the sections list,
  // orders the chips naming them.
  const chartsLast = usePhone();

  const charts = (
    <Section
      key={VG_SECTIONS.charts}
      id={VG_SECTIONS.charts}
    >
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
            yearType={filterState.yearType}
          />
        }
      />
    </Section>
  );

  const library = (
    <Section
      key={VG_SECTIONS.library}
      id={VG_SECTIONS.library}
    >
      <Finished
        count={wallPopulation(data, vgModule.noun)}
        MediaComponent={CardMediaImage}
        title="All Games"
        border={VG_BORDER}
        data={data}
        colour={(item) => companyToColor(item, scheme)}
        landscape
      />
    </Section>
  );

  return (
    <Stack spacing={2}>
      <PageRail
        sections={vgSections(playing.length > 0, chartsLast)}
        count={data.length}
      />
      <Stats
        data={data}
        playing={playing}
        yearType={filterState.yearType}
        yearTo={filterState.yearTo}
        measure={filterState.measure}
      />
      <Section id={VG_SECTIONS.timeline}>
        <Timeline data={deferredData} />
      </Section>
      <ChartsAndLibrary
        charts={charts}
        library={library}
        chartsLast={chartsLast}
      />
    </Stack>
  );
});

Graphs.displayName = "Graphs";

export default SuspenseBlock;

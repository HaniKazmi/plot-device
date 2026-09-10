import Stats from "./Stats";
import { VideoGame, companyToColor } from "./types";
import { gameModule } from "./module";
import { useScheme } from "../common/useScheme";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import Finished from "../common/Finished";
import Timeline from "./Timeline";
import CardMediaImage from "./CardMediaImage";
import type { FilterState } from "./filterUtils";
import { FranchiseContext, gameFranchise } from "./franchiseContext";
import { franchiseIndex } from "../common/franchiseIndex";
import { memo, useDeferredValue } from "react";
import { Stack } from "@mui/material";
import { ChartPair, Section } from "../common/SectionRail";
import { PageRail } from "../app/PageRail";
import { GAME_SECTIONS, gameSections } from "./sections";
import { currentlyPlaying } from "./statsData";
import { wallPopulation } from "../common/finishedData";

/** What the wall's card borders speak, and the key beneath its header names. */
const VG_BORDER = { key: "company", valueOf: (game: VideoGame) => game.company };

const SuspenseBlock = ({
  filteredData,
  upToData,
  unfilteredData,
  filterState,
}: {
  filteredData: VideoGame[];
  upToData: VideoGame[];
  unfilteredData: VideoGame[];
  filterState: FilterState;
}) => (
  <FranchiseContext.Provider value={franchiseIndex(unfilteredData, gameFranchise)}>
    <Graphs
      data={filteredData}
      upTo={upToData}
      filterState={filterState}
    />
  </FranchiseContext.Provider>
);

const Graphs = memo(
  ({ data, upTo, filterState }: { data: VideoGame[]; upTo: VideoGame[]; filterState: FilterState }) => {
    const scheme = useScheme();
    const deferredData = useDeferredValue(data, []);
    // Answered once for the page: it decides both whether the hero is rendered and whether the
    // rail offers a chip pointing at it, and two derivations of one test are two that can differ.
    const playing = currentlyPlaying(data);

    return (
      <Stack spacing={2}>
        <PageRail
          sections={gameSections(playing.length > 0)}
          count={data.length}
        />
        <Stats
          data={data}
          upTo={upTo}
          playing={playing}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
          measure={filterState.measure}
        />
        <Section id={GAME_SECTIONS.timeline}>
          <Timeline data={deferredData} />
        </Section>
        <Section id={GAME_SECTIONS.charts}>
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
        <Section id={GAME_SECTIONS.library}>
          <Finished
            count={wallPopulation(data, gameModule.noun)}
            MediaComponent={CardMediaImage}
            title="All Games"
            border={VG_BORDER}
            data={data}
            colour={(item) => companyToColor(item, scheme)}
            landscape
          />
        </Section>
      </Stack>
    );
  },
);

Graphs.displayName = "Graphs";

export default SuspenseBlock;

import Stats from "./Stats";
import { VideoGame, companyToColor } from "./types";
import type { Scheme } from "../utils/types";
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
import {
  franchiseGroup,
  genreShelf,
  wallPopulation,
  type FinishedExtraSort,
  type FinishedUnit,
} from "../common/finishedData";

/** What the wall's card borders speak, and the key beneath its header names. */
const VG_BORDER = { key: "company", valueOf: (game: VideoGame) => game.company };

/**
 * A franchise as one card: Final Fantasy stands once on a shelf rather than as eighteen banners.
 * The franchise column rather than the series one, which is what the tab's own strips and filters
 * group a game by; a standalone game names itself there and stays a card of its own.
 */
const GAME_UNIT: FinishedUnit<VideoGame> = {
  labels: ["Games", "Franchises"],
  of: franchiseGroup,
};

/**
 * What the library can be shelved by beyond When and Franchise. A platform shelf carries no swatch:
 * the fifteen platforms resolve through five company fills, and a swatch repeated down seven
 * Nintendo shelves would say the colour means the platform.
 */
const gameShelves = (scheme: Scheme): readonly FinishedExtraSort<VideoGame>[] => [
  genreShelf(scheme),
  { label: "Platform", word: (game) => game.platform },
];

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
          <Timeline
            data={deferredData}
            yearType={filterState.yearType}
            yearTo={filterState.yearTo}
          />
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
            sorts={gameShelves(scheme)}
            unit={GAME_UNIT}
          />
        </Section>
      </Stack>
    );
  },
);

Graphs.displayName = "Graphs";

export default SuspenseBlock;

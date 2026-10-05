import { memo, useDeferredValue } from "react";
import { CURRENT_PLAINDATE } from "../common/date";
import { Card, CardContent, Stack } from "@mui/material";
import { Section } from "../common/SectionRail";
import { PageRail } from "../app/PageRail";
import { NothingMatches } from "../common/NothingMatches";
import { useNothingMatches } from "../common/nothingMatchesContext";
import { stripYearTicks } from "../common/timelineStripData";
import { electNow, hasNow, recentlyFinished } from "./adapter";
import { MEDIA_LAZY } from "../app/mediaLazy";
import type { Library } from "../app/library";
import type { OmniItem } from "../common/medium";
import Barchart from "./Barchart";
import Crossings from "./Crossings";
import { crossings } from "./crossingsData";
import Gallery from "./Gallery";
import Timeline from "./Timeline";
import type { TimelineLayout } from "../common/TimelineSection";
import { galleryItems } from "../app/galleryData";
import GenreBridge from "./GenreBridge";
import RecentlyFinished from "./RecentlyFinished";
import { genreBridge } from "./genreBridgeData";
import Stats from "./Stats";
import { OMNIBUS_SECTIONS, omnibusSections } from "./sections";
import { pageState, type FilterState } from "./filterUtils";
import FranchiseProviders from "./FranchiseProviders";

/**
 * Across and the grid alone: two thousand entries across four media are a stack whose lanes run to
 * hairlines and a clock eighty lanes deep, where Across names each and the grid pictures them by
 * month. A franchise's own page, a few dozen of them, offers all four.
 */
const OMNIBUS_LAYOUTS: readonly TimelineLayout[] = ["Across", "Grid"];

/** The page inside the providers every card on it reads (`FranchiseProviders`). */
const SuspenseBlock = ({
  library,
  filteredData,
  upToData,
  filterState,
}: {
  library: Library;
  filteredData: OmniItem[];
  upToData: OmniItem[];
  filterState: FilterState;
}) => (
  <FranchiseProviders library={library}>
    <Graphs
      library={library}
      data={filteredData}
      upTo={upToData}
      filterState={filterState}
    />
  </FranchiseProviders>
);

const Graphs = memo(
  ({
    library,
    data,
    upTo,
    filterState,
  }: {
    library: Library;
    data: OmniItem[];
    upTo: OmniItem[];
    filterState: FilterState;
  }) => {
    // The charts and the browse surfaces re-render at lower priority, so a filter toggle answers
    // at once on a page composing four libraries; the bands above them read the fresh array, the
    // way every other tab splits the two.
    const deferredData = useDeferredValue(data, []);
    const { active: nothing } = useNothingMatches();
    // Answered once for the page: it decides both whether the Now band is rendered and whether the
    // rail offers a chip pointing at it, and two derivations of one test are two that can differ.
    const now = electNow(MEDIA_LAZY, library, filterState);

    // Derived here and handed to both the section and the vitals card, on the `now` rule: the
    // grouping is not cheap, and two derivations of it could report different counts. The epoch is
    // the crossings' own, because the scale has to open where the earliest drawn entry begins.
    const crossed = crossings(deferredData, CURRENT_PLAINDATE);
    const bridge = genreBridge(deferredData);
    // The two browse surfaces answer over what is left after the filters, and each is answered
    // once: the section renders from the same array the rail's chip is gated on, so a chip cannot
    // offer a shelf with nothing on it.
    const shelved = galleryItems(deferredData);
    const finished = recentlyFinished(deferredData);

    return (
      <Stack spacing={2}>
        <PageRail
          sections={omnibusSections({
            now: hasNow(now),
            timeline: deferredData.length > 0,
            charts: deferredData.length > 0,
            crossings: crossed.found.length > 0,
            library: shelved.length > 0,
            finished: finished.length > 0,
            genres: bridge.length > 0,
          })}
          count={data.length}
        />
        {/* Every section below is gated on having something to draw, so a page the reader has
            narrowed to nothing would otherwise be a rail over an empty page: the shells that state
            why are all unmounted. The vitals above still stand, reading zero, which is the honest
            answer to what the filters left. */}
        {nothing && (
          <Card>
            <CardContent>
              <NothingMatches />
            </CardContent>
          </Card>
        )}
        <Stats
          data={data}
          upTo={upTo}
          now={now}
          crossings={crossed.found}
          measure={filterState.measure}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
        />
        {deferredData.length > 0 && (
          <Section id={OMNIBUS_SECTIONS.timeline}>
            <Timeline
              data={deferredData}
              yearType={filterState.yearType}
              yearTo={filterState.yearTo}
              dispatch={pageState.dispatch}
              layouts={OMNIBUS_LAYOUTS}
            />
          </Section>
        )}
        {finished.length > 0 && (
          <Section id={OMNIBUS_SECTIONS.finished}>
            <RecentlyFinished items={finished} />
          </Section>
        )}
        {deferredData.length > 0 && (
          <Section id={OMNIBUS_SECTIONS.charts}>
            <Barchart
              data={deferredData}
              measure={filterState.measure}
            />
          </Section>
        )}
        {bridge.length > 0 && (
          <Section id={OMNIBUS_SECTIONS.genres}>
            <GenreBridge
              items={deferredData}
              measure={filterState.measure}
            />
          </Section>
        )}
        {crossed.found.length > 0 && (
          <Section id={OMNIBUS_SECTIONS.crossings}>
            <Crossings
              crossings={crossed.found}
              ticks={stripYearTicks(crossed.epoch, CURRENT_PLAINDATE)}
            />
          </Section>
        )}
        {/* The library closes the page at every width, as every tab's own does: it is the section
            built to be scrolled into and stayed in. */}
        {shelved.length > 0 && (
          <Section id={OMNIBUS_SECTIONS.library}>
            <Gallery
              data={shelved}
              measure={filterState.measure}
            />
          </Section>
        )}
      </Stack>
    );
  },
);

Graphs.displayName = "Graphs";

export default SuspenseBlock;

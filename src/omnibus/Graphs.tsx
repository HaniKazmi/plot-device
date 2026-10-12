import { memo, useDeferredValue } from "react";
import { Card, CardContent, Stack } from "@mui/material";
import { ChartPair, Section } from "../common/SectionRail";
import { PageRail } from "../app/PageRail";
import { NothingMatches } from "../common/NothingMatches";
import { useNothingMatches } from "../common/nothingMatchesContext";
import { electNow, hasNow, recentlyFinished } from "./adapter";
import { MEDIA_LAZY } from "../app/mediaLazy";
import type { Library } from "../app/library";
import type { OmniItem } from "../common/medium";
import Barchart from "./Barchart";
import Gallery from "./Gallery";
import Timeline from "./Timeline";
import type { TimelineLayout } from "../common/TimelineSection";
import { galleryItems } from "../app/galleryData";
import GenreBridge from "./GenreBridge";
import RecentlyFinished from "./RecentlyFinished";
import { genreBridge } from "./genreBridgeData";
import Stats from "./Stats";
import Yearbook from "./Yearbook";
import TopFranchises from "./TopFranchises";
import { OMNIBUS_SECTIONS, omnibusSections } from "./sections";
import { pageState, type FilterState } from "./filterUtils";
import FranchiseProviders from "./FranchiseProviders";

/**
 * Across and the grid alone: two thousand entries across four media are a stack whose lanes run to
 * hairlines, where Across names each and the grid pictures them by month.
 */
const OMNIBUS_LAYOUTS: readonly TimelineLayout[] = ["Across", "Grid"];

/** The By year chart's height beside the genre bridge, whose twelve genres stand about 490px tall. */
const BY_YEAR_BESIDE_GENRES = "390px";

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

    const bridge = genreBridge(deferredData);
    // The two browse surfaces answer over what is left after the filters, and each is answered
    // once: the section renders from the same array the rail's chip is gated on, so a chip cannot
    // offer a shelf with nothing on it.
    const shelved = galleryItems(deferredData);
    const finished = recentlyFinished(deferredData);
    // The timeline, the charts, the yearbook and the franchises each draw something from any row.
    const drawn = deferredData.length > 0;

    return (
      <Stack spacing={2}>
        <PageRail
          sections={omnibusSections({
            now: hasNow(now),
            timeline: drawn,
            charts: drawn,
            yearbook: drawn,
            franchises: drawn,
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
          measure={filterState.measure}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
        />
        {drawn && (
          <Section id={OMNIBUS_SECTIONS.timeline}>
            <Timeline
              data={deferredData}
              yearType={filterState.yearType}
              yearTo={filterState.yearTo}
              dispatch={pageState.dispatch}
              layouts={OMNIBUS_LAYOUTS}
              // All four media at once, eighty-odd marks a year: two years to a desktop card is the
              // widest at which most of them still carry a name rather than a letter.
              spans={{ desktop: "2", phone: "1" }}
              gridYears={1}
            />
          </Section>
        )}
        {finished.length > 0 && (
          <Section id={OMNIBUS_SECTIONS.finished}>
            <RecentlyFinished items={finished} />
          </Section>
        )}
        {/* Side by side from `md`: how much each year held beside what each genre is made of,
            the two readings of the library's whole that divide it by medium. The chart is drawn
            short enough to end level with the twelve genres the bridge opens on. */}
        {drawn && (
          <ChartPair
            chartHeight={BY_YEAR_BESIDE_GENRES}
            left={
              <Section id={OMNIBUS_SECTIONS.charts}>
                <Barchart
                  data={deferredData}
                  measure={filterState.measure}
                />
              </Section>
            }
            right={
              bridge.length > 0 && (
                <Section id={OMNIBUS_SECTIONS.genres}>
                  <GenreBridge
                    items={deferredData}
                    measure={filterState.measure}
                  />
                </Section>
              )
            }
          />
        )}
        {/* Side by side from `md`: the years the library was met in beside the franchises it is
            made of, two ways into the same works by picture, each half the width it would take
            alone and so a row of tiles no taller than the other. */}
        {drawn && (
          <ChartPair
            left={
              <Section id={OMNIBUS_SECTIONS.yearbook}>
                <Yearbook
                  items={deferredData}
                  measure={filterState.measure}
                  onYear={(year) => pageState.dispatch({ type: "scope", yearTo: year, yearType: "matching" })}
                />
              </Section>
            }
            right={
              <Section id={OMNIBUS_SECTIONS.franchises}>
                <TopFranchises
                  items={deferredData}
                  measure={filterState.measure}
                />
              </Section>
            }
          />
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

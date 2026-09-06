import { memo, useDeferredValue } from "react";
import { CURRENT_PLAINDATE } from "../common/date";
import { Card, CardContent, Stack } from "@mui/material";
import { usePhone } from "../common/breakpoints";
import { franchiseIndex } from "../common/franchiseIndex";
import { Section } from "../common/SectionRail";
import { PageRail } from "../app/PageRail";
import { NothingMatches } from "../common/NothingMatches";
import { useNothingMatches } from "../common/nothingMatchesContext";
import { stripYearTicks } from "../common/timelineStripData";
import {
  bookEpoch,
  bookFranchise,
  BookEpochProvider,
  FranchiseContext as BookFranchiseContext,
} from "../books/franchiseContext";
import { FranchiseContext as MovieFranchiseContext, movieFranchise } from "../movie/franchiseContext";
import { FranchiseContext as ShowFranchiseContext, showFranchise } from "../show/franchiseContext";
import { FranchiseContext as VgFranchiseContext, vgFranchise } from "../vg/franchiseContext";
import { electNow, hasNow, recentlyFinished } from "./adapter";
import { MEDIA_LAZY } from "../app/mediaLazy";
import type { Library } from "../app/library";
import type { OmniItem } from "../common/medium";
import Barchart from "./Barchart";
import Crossings from "./Crossings";
import { crossings } from "./crossingsData";
import Gallery from "./Gallery";
import { galleryItems } from "../app/galleryData";
import GenreBridge from "./GenreBridge";
import RecentlyFinished from "./RecentlyFinished";
import { genreBridge } from "./genreBridgeData";
import Stats from "./Stats";
import { OMNIBUS_SECTIONS, omnibusSections } from "./sections";
import type { FilterState } from "./filterUtils";

/**
 * The four franchise indexes the domains' own cards read, and the scale the Books strips draw on.
 *
 * A card opened from this tab is the domain's card, strip and all, and the strip asks its
 * domain's context for the rest of the series. Without the providers every strip here would hold
 * the one item it was opened from — a wrong answer rather than a missing one. The indexes are
 * built from the guest-filtered libraries, which is the one filter a strip must honour. The Books
 * epoch travels the same way for the same reason: a book's strip on this tab has to open where it
 * opens on its own.
 */
const SuspenseBlock = ({
  library,
  filteredData,
  filterState,
}: {
  library: Library;
  filteredData: OmniItem[];
  filterState: FilterState;
}) => (
  <VgFranchiseContext.Provider value={franchiseIndex(library.game, vgFranchise)}>
    <ShowFranchiseContext.Provider value={franchiseIndex(library.show, showFranchise)}>
      <MovieFranchiseContext.Provider value={franchiseIndex(library.movie, movieFranchise)}>
        <BookFranchiseContext.Provider value={franchiseIndex(library.book, bookFranchise)}>
          <BookEpochProvider value={bookEpoch(library.book)}>
            <Graphs
              library={library}
              data={filteredData}
              filterState={filterState}
            />
          </BookEpochProvider>
        </BookFranchiseContext.Provider>
      </MovieFranchiseContext.Provider>
    </ShowFranchiseContext.Provider>
  </VgFranchiseContext.Provider>
);

const Graphs = memo(
  ({ library, data, filterState }: { library: Library; data: OmniItem[]; filterState: FilterState }) => {
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
    // The wall and the gallery are the two longest sections on the page, so only one of them can
    // close it on a phone; the gallery moves after Franchises there (`omnibusSections` reorders
    // the chip the same way).
    const phone = usePhone();

    const gallerySection = shelved.length > 0 && (
      <Section
        key={OMNIBUS_SECTIONS.gallery}
        id={OMNIBUS_SECTIONS.gallery}
      >
        <Gallery
          data={shelved}
          measure={filterState.measure}
        />
      </Section>
    );

    const genresSection = bridge.length > 0 && (
      <Section
        key={OMNIBUS_SECTIONS.genres}
        id={OMNIBUS_SECTIONS.genres}
      >
        <GenreBridge
          items={deferredData}
          measure={filterState.measure}
        />
      </Section>
    );

    const crossingsSection = crossed.found.length > 0 && (
      <Section
        key={OMNIBUS_SECTIONS.crossings}
        id={OMNIBUS_SECTIONS.crossings}
      >
        <Crossings
          crossings={crossed.found}
          ticks={stripYearTicks(crossed.epoch, CURRENT_PLAINDATE)}
          items={deferredData}
        />
      </Section>
    );

    return (
      <Stack spacing={2}>
        <PageRail
          sections={omnibusSections(
            {
              now: hasNow(now),
              charts: deferredData.length > 0,
              crossings: crossed.found.length > 0,
              gallery: shelved.length > 0,
              finished: finished.length > 0,
              genres: bridge.length > 0,
            },
            phone,
          )}
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
          now={now}
          crossings={crossed.found}
          measure={filterState.measure}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
        />
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
        {phone ? [genresSection, crossingsSection, gallerySection] : [gallerySection, genresSection, crossingsSection]}
      </Stack>
    );
  },
);

Graphs.displayName = "Graphs";

export default SuspenseBlock;

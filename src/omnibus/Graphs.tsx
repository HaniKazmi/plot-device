import { AutoStories, LocalMovies, Tv, VideogameAsset, type SvgIconComponent } from "@mui/icons-material";
import { memo, useDeferredValue } from "react";
import { CURRENT_PLAINDATE, type YearNumber } from "../common/date";
import { Stack } from "@mui/material";
import { franchiseIndex } from "../common/franchiseIndex";
import { Section, SectionRail } from "../common/SectionRail";
import { FilterChip } from "../common/FilterDrawer";
import { stated } from "../common/population";
import { SchemaFilterDrawer } from "../common/FilterControls";
import { MeasureControl, ScopeControl } from "../common/SelectionComponents";
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
import { useOtherTabs } from "../tabs";
import { earliestYear, electNow, hasNow, recentlyFinished } from "./adapter";
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
import { omniFilters } from "./filters";
import { activeCount, type FilterDispatch, type FilterState } from "./filterUtils";
import type { Measure } from "../app/types";
import type { Medium } from "../utils/types";

/**
 * What this tab's population is counted in. Not a `noun` off a module, the four being composed
 * here: a row of the union is a game, a season, a film or a book, and the only word true of all
 * four is the one the measure control already offers beside it.
 */
const OMNIBUS_NOUN = "items";

/** The measures this tab counts in, in the order the rail states them. */
const MEASURES: readonly Measure[] = ["Hours", "Items"];

/**
 * An icon per medium switch. Held here rather than beside the schema for the reason every domain's
 * are held in its lazy half: a schema is data the shell can reach, and an icon named in it would
 * put these four in the first bundle a visitor downloads. This tab is not a medium and has no
 * module to hang them off, so the chunk drawing its charts is where they sit.
 */
const filterIcons: Record<Medium, SvgIconComponent> = {
  game: VideogameAsset,
  show: Tv,
  movie: LocalMovies,
  book: AutoStories,
};

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
  unfilteredData,
  filterState,
  filterDispatch,
}: {
  library: Library;
  filteredData: OmniItem[];
  unfilteredData: OmniItem[];
  filterState: FilterState;
  filterDispatch: FilterDispatch;
}) => (
  <VgFranchiseContext.Provider value={franchiseIndex(library.game, vgFranchise)}>
    <ShowFranchiseContext.Provider value={franchiseIndex(library.show, showFranchise)}>
      <MovieFranchiseContext.Provider value={franchiseIndex(library.movie, movieFranchise)}>
        <BookFranchiseContext.Provider value={franchiseIndex(library.book, bookFranchise)}>
          <BookEpochProvider value={bookEpoch(library.book)}>
            <Graphs
              library={library}
              data={filteredData}
              // The floor of the rail's year picker, read from the whole union rather than from what the
              // filters left: derived from the filtered data, picking "In 2020" would leave 2020
              // the earliest year on offer and strand the reader in it.
              earliestYear={earliestYear(unfilteredData)}
              filterState={filterState}
              filterDispatch={filterDispatch}
            />
            <SchemaFilterDrawer
              schema={omniFilters}
              icons={filterIcons}
              state={filterState}
              dispatch={filterDispatch}
              data={unfilteredData}
              activeCount={activeCount(filterState)}
              onReset={() => filterDispatch({ type: "resetFilters" })}
            />
          </BookEpochProvider>
        </BookFranchiseContext.Provider>
      </MovieFranchiseContext.Provider>
    </ShowFranchiseContext.Provider>
  </VgFranchiseContext.Provider>
);

const Graphs = memo(
  ({
    library,
    data,
    earliestYear,
    filterState,
    filterDispatch,
  }: {
    library: Library;
    data: OmniItem[];
    earliestYear: YearNumber;
    filterState: FilterState;
    filterDispatch: FilterDispatch;
  }) => {
    // The charts and the browse surfaces re-render at lower priority, so a filter toggle answers
    // at once on a page composing four libraries; the bands above them read the fresh array, the
    // way every other tab splits the two.
    const deferredData = useDeferredValue(data, []);
    const tabs = useOtherTabs();
    // Answered once for the page: it decides both whether the Now band is rendered and whether the
    // rail offers a chip pointing at it, and two derivations of one test are two that can differ.
    const now = electNow(library, filterState);

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
        <SectionRail
          sections={omnibusSections({
            now: hasNow(now),
            charts: deferredData.length > 0,
            crossings: crossed.found.length > 0,
            gallery: shelved.length > 0,
            finished: finished.length > 0,
            genres: bridge.length > 0,
          })}
          tabs={tabs}
          actions={
            <>
              <ScopeControl
                yearTo={filterState.yearTo}
                yearType={filterState.yearType}
                earliestYear={earliestYear}
                dispatch={filterDispatch}
              />
              <MeasureControl
                measures={MEASURES}
                value={filterState.measure}
                dispatch={filterDispatch}
              />
            </>
          }
          trailing={
            <FilterChip
              label={stated(data.length, OMNIBUS_NOUN)}
              activeCount={activeCount(filterState)}
            />
          }
        />
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
        {shelved.length > 0 && (
          <Section id={OMNIBUS_SECTIONS.gallery}>
            <Gallery
              data={shelved}
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
              items={deferredData}
            />
          </Section>
        )}
      </Stack>
    );
  },
);

Graphs.displayName = "Graphs";

export default SuspenseBlock;

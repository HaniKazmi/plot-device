import { FilterChip, PageChip } from "../common/PageHandles";
import { stated } from "../common/population";
import { SectionRail, type RailSection } from "../common/SectionRail";
import { MeasureControl, ScopeControl } from "../common/SelectionComponents";
import { useScheme } from "../common/useScheme";
import { barColour, useOtherTabs } from "../tabs";
import { usePage } from "./page";

/**
 * The section rail with the page's own controls already in it.
 *
 * The four things the rail holds beside the chips — the year scope, the measure, the population
 * chip and the phone's page chip — are one arrangement over one page's state, and every tab was
 * building it out of its own filter state: five copies of a rule about which control stands where,
 * kept in step by hand. Asked of the tab id here instead, a `Graphs` says only which sections its
 * page has, and the fifth tab, whose state comes from no medium at all, draws the same rail as the
 * other four rather than a near copy of it.
 *
 * It reads the tab, its state and its page module rather than taking them (`usePage`), so the
 * arrangement and what it is over are one lookup: a page handing down its own store could hand
 * down another's.
 *
 * `count` is the one thing the page knows and this does not — the rows its charts are actually
 * drawn from. Re-derived here it would run the page's own predicate over the library a second time
 * on every render, and a figure arrived at twice can disagree with what is on screen.
 */
export const PageRail = ({ sections, count }: { sections: RailSection[]; count: number }) => {
  // `page` is absent only while the tab's own sheet is still landing, where the page below has
  // nothing drawn either: the rail keeps its chips and offers no settings over a library that is
  // not here.
  const { tab, page, state, dispatch } = usePage();
  const tabs = useOtherTabs();
  const scheme = useScheme();

  return (
    <SectionRail
      sections={sections}
      tabs={tabs}
      phoneGround={barColour(tab, scheme)}
      scope={
        page && (
          <ScopeControl
            label="Years"
            yearTo={state.yearTo}
            yearType={state.yearType}
            earliestYear={page.earliestYear}
            dispatch={dispatch}
          />
        )
      }
      measure={
        page && (
          <MeasureControl
            measures={page.measures}
            value={state.measure}
            dispatch={dispatch}
          />
        )
      }
      population={
        page && (
          <FilterChip
            label={stated(count, page.noun)}
            activeCount={page.store.activeCountOf(state)}
          />
        )
      }
      pageChip={
        <PageChip
          measure={state.measure}
          activeCount={page ? page.store.activeCountOf(state) : 0}
        />
      }
    />
  );
};

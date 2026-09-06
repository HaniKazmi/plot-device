import { RailChip } from "../common/ChipRail";
import { FilterChip, PageChip } from "../common/PageHandles";
import { askPhoneBarTabs } from "../common/phoneBar";
import { stated } from "../common/population";
import { SectionRail, type RailSection } from "../common/SectionRail";
import { MeasureControl, ScopeControl } from "../common/SelectionComponents";
import { useScheme } from "../common/useScheme";
import { tabInk, useCurrentTab, useOtherTabs } from "../tabs";
import { useLibrary } from "./library";
import { pageOf, usePageState } from "./pageState";

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
 * It reads the tab, its state and its page module rather than taking them, so the arrangement and
 * what it is over are one lookup: a page handing down its own store could hand down another's.
 *
 * `count` is the one thing the page knows and this does not — the rows its charts are actually
 * drawn from. Re-derived here it would run the page's own predicate over the library a second time
 * on every render, and a figure arrived at twice can disagree with what is on screen.
 */
export const PageRail = ({ sections, count }: { sections: RailSection[]; count: number }) => {
  const tab = useCurrentTab();
  const tabs = useOtherTabs();
  const scheme = useScheme();
  const TabIcon = tab.icon;
  const library = useLibrary();
  const [state] = usePageState(tab.id);
  // Absent only while the tab's own sheet is still landing, where the page below has nothing
  // drawn either: the rail keeps its chips and offers no settings over a library that is not here.
  const page = pageOf(tab.id, library);

  return (
    <SectionRail
      sections={sections}
      tabs={tabs}
      scope={
        page && (
          <ScopeControl
            label="Years"
            yearTo={state.yearTo}
            yearType={state.yearType}
            earliestYear={page.earliestYear}
            dispatch={page.store.dispatch}
          />
        )
      }
      measure={
        page && (
          <MeasureControl
            measures={page.measures}
            value={state.measure}
            dispatch={page.store.dispatch}
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
      tabChip={
        // The tab in hand, in the colour the rail names every tab by, standing where the other four
        // do from `sm` up: a page's own chips lead the row there because the app bar above states
        // the tab, and on a phone the bar the row is drawn in is the only thing that can.
        <RailChip
          icon={<TabIcon />}
          ariaLabel="Tabs"
          colour={tabInk(tab, scheme)}
          onClick={askPhoneBarTabs}
        />
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

import { beforeEach, describe, expect, it } from "vitest";
import { PAGE_STORES } from "../../src/app/pageState";
import { CURRENT_YEAR, type YearNumber } from "../../src/common/date";
import Tabs from "../../src/tabs";
import { activeCount, pageState as vgPageState } from "../../src/vg/filterUtils";
import { pageState as showPageState } from "../../src/show/filterUtils";

/**
 * A tab's state outlives the tab: the stores are module-scope, so a reader coming back to a page
 * finds the measure, the scope and the filters they left on it, and a surface standing outside a
 * tab can set a filter on it before it is ever mounted.
 *
 * What that costs is exercised here — every test in this file shares the five stores, as the app
 * does — so each starts from the state the app opens on rather than from whatever ran before it.
 */
const opening = Object.entries(PAGE_STORES).map(([id, store]) => [id, store.get()] as const);

beforeEach(() => opening.forEach(([id, state]) => PAGE_STORES[id].set(state)));

describe("the page stores", () => {
  it("holds one for every tab", () => {
    // A missing entry is a throw inside a hook, with no error boundary above it: the tab paints
    // as a blank page. The composing tab's own id is a literal in `omnibus/pageModule.ts`, which
    // is the one this pins.
    const missing = Tabs.map((tab) => tab.id).filter((id) => !PAGE_STORES[id]);

    expect(missing).toEqual([]);
  });

  it("files each domain's own store under that domain's tab", () => {
    expect(PAGE_STORES.vg).toBe(vgPageState);
    expect(PAGE_STORES.show).toBe(showPageState);
  });

  it("keeps each tab's state to itself", () => {
    PAGE_STORES.vg.dispatch({ type: "measure", measure: "Hours" });

    expect(PAGE_STORES.vg.get().measure).toBe("Hours");
    expect(PAGE_STORES.show.get().measure).toBe("Episodes");
    expect(PAGE_STORES.movies.get().measure).toBe("Films");
  });

  it("takes a filter for a tab nothing is standing inside", () => {
    // How a surface above the tabs narrows one it is not on: it dispatches on that tab's store and
    // then navigates, so nothing has to hold a filter waiting for a page to mount and read it.
    PAGE_STORES.show.dispatch({ type: "updateFilter", filter: "network", value: ["Netflix"] });

    expect(showPageState.get().network).toEqual(["Netflix"]);
    expect(showPageState.get().filter).not.toBe(opening.find(([id]) => id === "show")?.[1].filter);
  });

  it("notifies nobody for a press on the measure already held", () => {
    // The reducer answers the same object, and the store compares by identity, so a segment
    // pressed twice costs one render rather than two.
    let notified = 0;
    const stop = PAGE_STORES.vg.subscribe(() => notified++);

    PAGE_STORES.vg.dispatch({ type: "measure", measure: "Hours" });
    const held = PAGE_STORES.vg.get();
    PAGE_STORES.vg.dispatch({ type: "measure", measure: "Hours" });

    expect(notified).toBe(1);
    expect(PAGE_STORES.vg.get()).toBe(held);

    stop();
  });

  it("notifies nobody for the year reading already held", () => {
    let notified = 0;
    const stop = PAGE_STORES.vg.subscribe(() => notified++);

    PAGE_STORES.vg.dispatch({ type: "yearType", yearType: "matching" });
    PAGE_STORES.vg.dispatch({ type: "yearType", yearType: "matching" });

    expect(notified).toBe(1);

    stop();
  });
});

describe("what the badge counts and Clear clears", () => {
  const lastYear = (CURRENT_YEAR - 1) as YearNumber;

  it("counts a filter and not the scope beside it", () => {
    // The scope is a control of its own and lights itself, so a badge counting it would report a
    // choice made outside the surface the badge sits on.
    PAGE_STORES.vg.dispatch({ type: "updateFilter", filter: "yearTo", value: lastYear });
    PAGE_STORES.vg.dispatch({ type: "yearType", yearType: "matching" });

    expect(activeCount(vgPageState.get())).toBe(0);

    PAGE_STORES.vg.dispatch({ type: "updateFilter", filter: "endless", value: false });

    expect(activeCount(vgPageState.get())).toBe(1);
  });

  it("clears the filters and leaves the measure and the scope standing", () => {
    PAGE_STORES.vg.dispatch({ type: "updateFilter", filter: "endless", value: false });
    PAGE_STORES.vg.dispatch({ type: "updateFilter", filter: "franchise", value: ["Zelda"] });
    PAGE_STORES.vg.dispatch({ type: "measure", measure: "Hours" });
    PAGE_STORES.vg.dispatch({ type: "updateFilter", filter: "yearTo", value: lastYear });
    PAGE_STORES.vg.dispatch({ type: "yearType", yearType: "matching" });

    PAGE_STORES.vg.dispatch({ type: "resetFilters" });
    const cleared = vgPageState.get();

    expect(cleared.endless).toBe(true);
    expect(cleared.franchise).toEqual([]);
    expect(cleared.measure).toBe("Hours");
    expect(cleared.yearTo).toBe(lastYear);
    expect(cleared.yearType).toBe("matching");
    expect(activeCount(cleared)).toBe(0);
  });
});

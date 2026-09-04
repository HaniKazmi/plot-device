import { describe, expect, it } from "vitest";
import { isFilterSheetOpen, setFilterSheetOpen, subscribeToFilterSheet } from "../../src/common/filterSheet";

/**
 * The store the rail's filter chip and the drawer share, on opposite sides of a page's tree.
 *
 * The flag is module state, so each case leaves it closed for the next: the suite runs one module
 * instance and a case that opened it would hand the next one an open sheet.
 */
describe("the filter sheet's open flag", () => {
  it("starts closed", () => {
    expect(isFilterSheetOpen()).toBe(false);
  });

  it("notifies a subscriber on a change and not on a repeat of the value held", () => {
    let notifications = 0;
    const unsubscribe = subscribeToFilterSheet(() => {
      notifications += 1;
    });

    setFilterSheetOpen(true);
    expect(isFilterSheetOpen()).toBe(true);
    expect(notifications).toBe(1);

    // The chip and the drawer both call this; a press on a control naming the state already held
    // must not re-render every chart on the page.
    setFilterSheetOpen(true);
    expect(notifications).toBe(1);

    setFilterSheetOpen(false);
    expect(isFilterSheetOpen()).toBe(false);
    expect(notifications).toBe(2);

    unsubscribe();
    setFilterSheetOpen(true);
    expect(notifications).toBe(2);
    setFilterSheetOpen(false);
  });
});

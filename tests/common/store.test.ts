import { describe, expect, it } from "vitest";
import { createStore } from "../../src/common/store";

/**
 * One store per tab sits at module scope, and every control reading one can be pressed on the state
 * it already shows — the lit measure segment, the chip that opened the filter sheet. A set to the
 * value already held must therefore notify nobody, or each of those presses re-filters the whole
 * library and redraws every chart on the page.
 */
describe("createStore", () => {
  it("returns the initial value, then whatever was last set", () => {
    const store = createStore(1);

    expect(store.get()).toBe(1);

    store.set(2);
    expect(store.get()).toBe(2);
  });

  it("notifies a subscriber once per change", () => {
    const store = createStore(0);
    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    store.set(1);
    store.set(2);
    expect(notifications).toBe(2);
  });

  it("does not notify a set to the value already held", () => {
    const store = createStore("a");
    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    store.set("a");
    expect(notifications).toBe(0);

    store.set("b");
    expect(notifications).toBe(1);
  });

  it("stops notifying once unsubscribed", () => {
    const store = createStore(0);
    let notifications = 0;
    const unsubscribe = store.subscribe(() => {
      notifications += 1;
    });

    store.set(1);
    expect(notifications).toBe(1);

    unsubscribe();
    store.set(2);
    expect(notifications).toBe(1);
  });
});

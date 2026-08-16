import { describe, expect, it } from "vitest";
import { longPressEffects } from "../../src/utils/longPressReducer";

describe("longPressEffects", () => {
  it("clears any pending timer before scheduling a new one", () => {
    // Touch devices emit both touch and compatibility mouse events, so a single press produces
    // two starts. Cancelling first means the second restarts the timer rather than adding one.
    expect(longPressEffects("start", false)).toEqual(["cancel", "schedule"]);
  });

  it("fires the long press when the timer elapses", () => {
    expect(longPressEffects("timeout", false)).toEqual(["longPress"]);
  });

  it("cancels the timer on release", () => {
    expect(longPressEffects("end", false)).toEqual(["cancel"]);
  });

  it("reports a click on release when one is wired up", () => {
    expect(longPressEffects("end", true)).toEqual(["cancel", "click"]);
  });

  it("reports both the long press and a click when a held press is released", () => {
    // Nothing records that the timeout already fired, so the full gesture — start, timeout,
    // end — emits longPress and then click. The AppBar passes no click handler, which is the
    // only reason guest mode is not immediately followed by whatever a tap would do.
    const gesture = [
      ...longPressEffects("start", true),
      ...longPressEffects("timeout", true),
      ...longPressEffects("end", true),
    ];

    expect(gesture).toEqual(["cancel", "schedule", "longPress", "cancel", "click"]);
  });

  it("emits no click for a held press when no handler is given", () => {
    const gesture = [
      ...longPressEffects("start", false),
      ...longPressEffects("timeout", false),
      ...longPressEffects("end", false),
    ];

    expect(gesture).toEqual(["cancel", "schedule", "longPress", "cancel"]);
  });

  it("cancels before the long press can fire on a short tap", () => {
    const gesture = [...longPressEffects("start", true), ...longPressEffects("end", true)];

    expect(gesture).not.toContain("longPress");
    expect(gesture).toContain("click");
  });

  it("always cancels before doing anything else", () => {
    // Whichever event arrives, the pending timer is dealt with first, so no effect can run
    // against a timer that is about to be replaced.
    for (const event of ["start", "end"] as const) {
      expect(longPressEffects(event, true)[0]).toBe("cancel");
    }
  });
});

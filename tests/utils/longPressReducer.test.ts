import { describe, expect, it } from "vitest";
import { initialLongPressState, longPress, type LongPressEvent } from "../../src/utils/longPressReducer";

/** Replays a whole gesture, threading the state through as the hook does. */
const gesture = (events: LongPressEvent[], hasClickHandler = true) =>
  events.reduce(
    (acc, event) => {
      const next = longPress(acc.state, event, hasClickHandler);
      return { state: next.state, effects: [...acc.effects, ...next.effects] };
    },
    { state: initialLongPressState, effects: [] as string[] },
  ).effects;

describe("longPress", () => {
  it("clears any pending timer before scheduling a new one", () => {
    // Touch devices emit both touch and compatibility mouse events, so a single press produces
    // two starts. Cancelling first means the second restarts the timer rather than adding one.
    expect(longPress(initialLongPressState, "start", false).effects).toEqual(["cancel", "schedule"]);
  });

  it("fires the long press when the timer elapses", () => {
    expect(longPress(initialLongPressState, "timeout", false).effects).toEqual(["longPress"]);
  });

  it("reports a click on a short tap", () => {
    expect(gesture(["start", "end"])).toEqual(["cancel", "schedule", "cancel", "click"]);
  });

  it("reports no click when releasing a press that already fired the long press", () => {
    // Releasing after a long press ends that gesture; it is not a tap on top of it.
    expect(gesture(["start", "timeout", "end"])).toEqual(["cancel", "schedule", "longPress", "cancel"]);
  });

  it("cancels the timer on release even with no click handler", () => {
    expect(gesture(["start", "end"], false)).toEqual(["cancel", "schedule", "cancel"]);
  });

  it("emits no click at all when none is wired up", () => {
    expect(gesture(["start", "timeout", "end"], false)).not.toContain("click");
  });

  it("arms the next gesture cleanly, so a tap after a long press still clicks", () => {
    expect(gesture(["start", "timeout", "end", "start", "end"])).toEqual([
      "cancel",
      "schedule",
      "longPress",
      "cancel",
      "cancel",
      "schedule",
      "cancel",
      "click",
    ]);
  });

  it("treats a repeated start as a restart rather than a second press", () => {
    expect(gesture(["start", "start", "end"])).toEqual(["cancel", "schedule", "cancel", "schedule", "cancel", "click"]);
  });

  it("always cancels before doing anything else", () => {
    // Whichever event arrives, the pending timer is dealt with first, so no effect runs
    // against a timer that is about to be replaced.
    for (const event of ["start", "end"] as const) {
      expect(longPress(initialLongPressState, event, true).effects[0]).toBe("cancel");
    }
  });
});

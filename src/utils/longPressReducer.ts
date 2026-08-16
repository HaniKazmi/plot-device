export type LongPressEvent = "start" | "end" | "timeout";

export type LongPressEffect = "schedule" | "cancel" | "longPress" | "click";

export interface LongPressState {
  /** Whether the long press has already fired for the press currently in progress. */
  fired: boolean;
}

export const initialLongPressState: LongPressState = { fired: false };

/**
 * What a press gesture should do in response to one event, and the state to carry forward.
 *
 * `start` always reschedules from scratch, so a repeated start — which touch devices produce,
 * because they emit both touch and compatibility mouse events — restarts the timer rather than
 * queueing a second one.
 *
 * A press that has already triggered the long press reports no click when it ends. Releasing
 * after a long press is the end of that gesture, not a tap on top of it.
 */
export const longPress = (
  state: LongPressState,
  event: LongPressEvent,
  hasClickHandler: boolean,
): { state: LongPressState; effects: LongPressEffect[] } => {
  switch (event) {
    case "start":
      return { state: { fired: false }, effects: ["cancel", "schedule"] };
    case "timeout":
      return { state: { fired: true }, effects: ["longPress"] };
    case "end":
      return {
        state: { fired: false },
        effects: hasClickHandler && !state.fired ? ["cancel", "click"] : ["cancel"],
      };
  }
};

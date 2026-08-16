export type LongPressEvent = "start" | "end" | "timeout";

export type LongPressEffect = "schedule" | "cancel" | "longPress" | "click";

/**
 * What a press gesture should do in response to one event.
 *
 * `start` always reschedules from scratch, so a repeated start — which touch devices produce,
 * because they emit both touch and compatibility mouse events — restarts the timer rather than
 * queueing a second one.
 *
 * `end` cancels the timer and always reports a click when one is wired up. It does not track
 * whether the long press already fired, so holding past the threshold and then releasing
 * reports both: the long press when the timer elapses, and a click on release.
 */
export const longPressEffects = (event: LongPressEvent, hasClickHandler: boolean): LongPressEffect[] => {
  switch (event) {
    case "start":
      return ["cancel", "schedule"];
    case "timeout":
      return ["longPress"];
    case "end":
      return hasClickHandler ? ["cancel", "click"] : ["cancel"];
  }
};

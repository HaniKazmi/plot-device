import { useRef, useLayoutEffect } from "react";
import { initialLongPressState, longPress, type LongPressEvent, type LongPressState } from "./longPressReducer";

const useLongPress = (onLongPress: () => void, onClick?: () => void, ms = 300) => {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const state = useRef<LongPressState>(initialLongPressState);

  const onLongPressRef = useRef(onLongPress);
  const onClickRef = useRef(onClick);

  useLayoutEffect(() => {
    onLongPressRef.current = onLongPress;
    onClickRef.current = onClick;
  });

  // What each event means lives in longPress; this only carries the effects out.
  const run = (event: LongPressEvent) => {
    const next = longPress(state.current, event, !!onClickRef.current);
    state.current = next.state;

    for (const effect of next.effects) {
      switch (effect) {
        case "cancel":
          clearTimeout(timer.current);
          break;
        case "schedule":
          timer.current = setTimeout(() => run("timeout"), ms);
          break;
        case "longPress":
          onLongPressRef.current();
          break;
        case "click":
          onClickRef.current?.();
          break;
      }
    }
  };

  // The pointer's gesture and no other. On touch a long press collides with the browser's own
  // press-and-hold — selection, the callout menu — and a tap arrives as compatibility mouse events
  // with the down and the up together at release, which schedules the timer and cancels it in the
  // same tick, so a finger can never hold one down. What the gesture reaches is offered outright
  // wherever a finger is the pointer, which is what leaves nothing for touch handlers to serve.
  return {
    onMouseDown: () => run("start"),
    onMouseUp: () => run("end"),
    onMouseLeave: () => run("cancel"),
  };
};

export default useLongPress;

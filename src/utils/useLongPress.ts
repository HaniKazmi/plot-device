import { useRef, useLayoutEffect } from "react";
import { longPressEffects, type LongPressEvent } from "./longPressReducer";

const useLongPress = (onLongPress: () => void, onClick?: () => void, ms = 300) => {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onLongPressRef = useRef(onLongPress);
  const onClickRef = useRef(onClick);

  useLayoutEffect(() => {
    onLongPressRef.current = onLongPress;
    onClickRef.current = onClick;
  });

  // What each event means lives in longPressEffects; this only carries the effects out.
  const run = (event: LongPressEvent) => {
    for (const effect of longPressEffects(event, !!onClickRef.current)) {
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

  return {
    onMouseDown: () => run("start"),
    onMouseUp: () => run("end"),
    onTouchStart: () => run("start"),
    onTouchEnd: () => run("end"),
  };
};

export default useLongPress;

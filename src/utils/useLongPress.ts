import { useCallback, useRef, useLayoutEffect } from "react";

const useLongPress = (onLongPress: () => void, onClick?: () => void, ms = 300) => {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onLongPressRef = useRef(onLongPress);
  const onClickRef = useRef(onClick);

  useLayoutEffect(() => {
    onLongPressRef.current = onLongPress;
    onClickRef.current = onClick;
  });

  const handleStart = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onLongPressRef.current();
    }, ms);
  }, [ms]);

  const handleEnd = useCallback(() => {
    clearTimeout(timer.current);
    if (onClickRef.current) {
      onClickRef.current();
    }
  }, []);

  return {
    onMouseDown: handleStart,
    onMouseUp: handleEnd,
    onTouchStart: handleStart,
    onTouchEnd: handleEnd,
  };
};

export default useLongPress;

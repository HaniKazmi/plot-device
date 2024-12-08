import { useCallback, useRef } from 'react';

const useLongPress = (
  onLongPress: () => void,
  onClick?: () => void,
  ms = 300,
) => {
  const timer = useRef(0)
  const handleStart = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
        onLongPress();
      }, ms);
  }, [onLongPress, ms]);

  const handleEnd = useCallback(() => {
    clearTimeout(timer.current)
    if (onClick) {
      onClick();
    }
  }, [onClick]);

  return {
    onMouseDown: handleStart,
    onMouseUp: handleEnd,
    onTouchStart: handleStart,
    onTouchEnd: handleEnd,
  };
};

export default useLongPress;
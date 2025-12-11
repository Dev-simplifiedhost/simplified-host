import { useCallback, useRef, useState } from "react";

interface LongPressOptions {
  duration?: number;
  onStart?: () => void;
  onCancel?: () => void;
}

interface LongPressResult {
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onTouchMove: () => void;
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  isPressed: boolean;
}

export function useLongPress(
  callback: () => void,
  options: LongPressOptions = {}
): LongPressResult {
  const { duration = 500, onStart, onCancel } = options;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  const start = useCallback(() => {
    setIsPressed(true);
    onStart?.();
    timerRef.current = setTimeout(() => {
      callback();
      setIsPressed(false);
    }, duration);
  }, [callback, duration, onStart]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isPressed) {
      onCancel?.();
    }
    setIsPressed(false);
  }, [isPressed, onCancel]);

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    isPressed,
  };
}

export default useLongPress;

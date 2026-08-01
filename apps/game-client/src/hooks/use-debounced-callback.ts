import { useEffect, useRef } from "react";
import { setMeasuredTimeout } from "@/lib/performance-monitoring/measured-callback";

export const useDebouncedCallback = <TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay: number,
): ((...args: TArgs) => void) => {
  const timeoutRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);
  const delayRef = useRef(delay);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    delayRef.current = delay;
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return (...args: TArgs) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setMeasuredTimeout(
      "hook.debounced-callback",
      () => {
        callbackRef.current(...args);
      },
      delayRef.current,
    );
  };
};

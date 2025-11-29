import { useCallback, useRef, useEffect } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useDebouncedCallback = <T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay],
  );
};

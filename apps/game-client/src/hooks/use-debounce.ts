import { useEffect, useState } from "react";
import { setMeasuredTimeout } from "@/lib/performance-monitoring/measured-callback";

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setMeasuredTimeout(
      "hook.debounce",
      () => {
        setDebouncedValue(value);
      },
      delay,
    );

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

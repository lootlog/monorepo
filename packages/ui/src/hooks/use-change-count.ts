import { useState } from "react";

export function useChangeCount<T>(value: T) {
  const [tracked, setTracked] = useState({ value, count: 0 });

  if (Object.is(tracked.value, value)) return tracked.count;

  const next = { value, count: tracked.count + 1 };

  setTracked(next);

  return next.count;
}

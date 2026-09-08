import * as React from "react";

export function useMaxWidth(maxWidth: number) {
  const query = `(max-width: ${maxWidth - 1}px)`;
  return React.useSyncExternalStore(
    (notify) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", notify);
      return () => mediaQuery.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

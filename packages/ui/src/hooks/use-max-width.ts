import * as React from "react";

/**
 * Whether the viewport is narrower than `maxWidth` CSS pixels at the default
 * text size. The query is in `rem`, like Tailwind's breakpoints, so a larger
 * browser text size switches layouts at the same points as the stylesheet.
 */
export function useMaxWidth(maxWidth: number) {
  const query = `(width < ${maxWidth / 16}rem)`;

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

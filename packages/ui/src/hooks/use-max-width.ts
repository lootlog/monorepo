import * as React from "react";

export function useMaxWidth(maxWidth: number) {
  const [isBelowMaxWidth, setIsBelowMaxWidth] = React.useState(
    () => window.matchMedia(`(max-width: ${maxWidth - 1}px)`).matches,
  );

  React.useEffect(() => {
    const mediaQueryList = window.matchMedia(`(max-width: ${maxWidth - 1}px)`);
    const updateMatchState = () => {
      setIsBelowMaxWidth(mediaQueryList.matches);
    };

    mediaQueryList.addEventListener("change", updateMatchState);
    updateMatchState();

    return () => {
      mediaQueryList.removeEventListener("change", updateMatchState);
    };
  }, [maxWidth]);

  return isBelowMaxWidth;
}

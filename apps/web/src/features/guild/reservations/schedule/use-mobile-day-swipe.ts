import { useEffect, useState } from "react";

export const MOBILE_DAY_SWIPE_MEDIA_QUERY =
  "(pointer: coarse) and (hover: none)";

const getIsMobileDaySwipeEnabled = () =>
  window.matchMedia(MOBILE_DAY_SWIPE_MEDIA_QUERY).matches;

export function useMobileDaySwipe() {
  const [isEnabled, setIsEnabled] = useState(getIsMobileDaySwipeEnabled);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(MOBILE_DAY_SWIPE_MEDIA_QUERY);
    const updateMatchState = () => setIsEnabled(mediaQueryList.matches);

    mediaQueryList.addEventListener("change", updateMatchState);
    updateMatchState();

    return () => {
      mediaQueryList.removeEventListener("change", updateMatchState);
    };
  }, []);

  return isEnabled;
}

import { useIsFetching } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { markBootMilestone } from "@/lib/boot-timing";

export const OverlayBootMarks = () => {
  const fetchingCount = useIsFetching();
  const fetchStarted = useRef(false);
  const settled = useRef(false);

  useEffect(() => {
    markBootMilestone("overlay-committed");
  }, []);

  useEffect(() => {
    if (settled.current) return;

    if (fetchingCount > 0) {
      fetchStarted.current = true;

      return;
    }

    if (!fetchStarted.current) return;
    settled.current = true;
    markBootMilestone("overlay-settled");
  }, [fetchingCount]);

  return null;
};

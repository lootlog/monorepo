import { getFixedT } from "@/i18n/get-fixed-t";

const SECOND_MS = 1_000;

/**
 * How long ago something was seen: just now, in seconds under a minute, in
 * minutes under an hour, then in hours. A caller whose clock ticks once a
 * minute passes `"minute"`, so it says "just now" for the whole first minute
 * instead of a seconds count that would not move.
 */
export const formatSeenAgo = (
  elapsedMs: number,
  precision: "second" | "minute" = "second",
): string => {
  const t = getFixedT("common");
  const seconds = Math.max(0, Math.floor(elapsedMs / SECOND_MS));
  const minutes = Math.floor(seconds / 60);

  if (seconds < 1 || (precision === "minute" && minutes < 1))
    return t("seenAgo.now");

  if (minutes < 1) return t("seenAgo.seconds", { count: seconds });

  if (minutes < 60) return t("seenAgo.minutes", { count: minutes });

  return t("seenAgo.hours", { count: Math.floor(minutes / 60) });
};

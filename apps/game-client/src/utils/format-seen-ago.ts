import { getFixedT } from "@/i18n/get-fixed-t";

const SECOND_MS = 1_000;

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

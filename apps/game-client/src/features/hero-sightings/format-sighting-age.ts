import type { TFunction } from "i18next";

const MINUTE_MS = 60_000;

/** How long ago a hero was seen: under a minute, in minutes, then in hours. */
export const formatSightingAge = (
  t: TFunction<"heroSightings">,
  seenAt: string,
  now: number,
): string => {
  const minutes = Math.max(
    0,
    Math.floor((now - Date.parse(seenAt)) / MINUTE_MS),
  );

  if (minutes < 1) return t("age.now");

  if (minutes < 60) return t("age.minutes", { count: minutes });

  return t("age.hours", { count: Math.floor(minutes / 60) });
};

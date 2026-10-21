import { createCachedFormatter } from "@lootlog/datetime";
import {
  FACTION_WAR_TIMEZONE,
  type FactionWarFaction,
} from "@lootlog/domain/faction-war";
import type { CSSProperties } from "react";

/** Barbatos holds the left half of the pick screen and faces right. */
export const FACTION_SIDES: Record<FactionWarFaction, "left" | "right"> = {
  BARBATOS: "left",
  TANROTH: "right",
};

export const PICK_SCREEN_FACTIONS = [
  "BARBATOS",
  "TANROTH",
] as const satisfies readonly FactionWarFaction[];

/** Text and light colours of each faction, on dark art and in game tips. */
export const FACTION_COLORS: Record<
  FactionWarFaction,
  { text: string; glow: string }
> = {
  BARBATOS: { text: "#ffb057", glow: "#ff5a1f" },
  TANROTH: { text: "#9fe0ff", glow: "#3ab4ff" },
};

/** The `--ll-fw-*` colours the pick screen's faction styles read. */
export const getFactionStyle = (faction: FactionWarFaction): CSSProperties => {
  const colors = FACTION_COLORS[faction];

  // SAFETY: CSSProperties has no index signature for custom properties; the
  // `--ll-fw-*` entries are read by the `.ll-fw-*` rules in index.css.
  return {
    "--ll-fw-text": colors.text,
    "--ll-fw-glow": colors.glow,
  } as CSSProperties;
};

const getDayFormatter = createCachedFormatter("pl-PL", {
  day: "numeric",
  month: "long",
});

/** A war day such as "20 października", in the war's own time zone. */
export const formatFactionWarDay = (at: number) =>
  getDayFormatter(FACTION_WAR_TIMEZONE).format(new Date(at));

/** `endsAt` is exclusive, so the last day of a war is the day before it. */
export const formatFactionWarLastDay = (endsAt: string) =>
  formatFactionWarDay(Date.parse(endsAt) - 1);

/** Points as Polish players read them: "18 242". */
export const formatFactionWarPoints = (points: number) =>
  points.toLocaleString("pl-PL");

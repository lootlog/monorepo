import type { FactionWarFaction } from "@lootlog/domain/faction-war";
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

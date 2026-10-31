import {
  FACTION_WARS,
  type FactionWarFaction,
} from "@lootlog/domain/faction-war";
import { FACTION_WAR_ASSETS_URL } from "@/config/app";

/** Art every war ships, in `<assets>/<war id>/<name>.webp`. */
type FactionWarAssetName =
  | "backdrop"
  | "character"
  | "emblem"
  | "burst"
  | "particles"
  | "cracks"
  | "aura"
  | "button"
  | "buttonHover";

const FACTION_FILE_PREFIX: Record<FactionWarFaction, string> = {
  BARBATOS: "barbatos",
  TANROTH: "tanroth",
};

// Effect sprites are named after their element rather than the faction.
const ELEMENT_FILES: Record<
  FactionWarFaction,
  Record<"burst" | "particles" | "cracks" | "aura", string>
> = {
  BARBATOS: {
    burst: "fire-burst",
    particles: "embers",
    cracks: "lava-cracks",
    aura: "fire-aura",
  },
  TANROTH: {
    burst: "ice-burst",
    particles: "snowflakes",
    cracks: "frost-cracks",
    aura: "ice-aura",
  },
};

const KNOWN_WAR_IDS = new Set(FACTION_WARS.map((war) => war.id));

/**
 * The URL of one faction's art for a war. A war id the client does not know
 * gets no art, so a newer server never points the client at missing files.
 */
export const getFactionWarAssetUrl = (
  warId: string,
  faction: FactionWarFaction,
  asset: FactionWarAssetName,
): string | null => {
  if (!KNOWN_WAR_IDS.has(warId)) return null;

  const prefix = FACTION_FILE_PREFIX[faction];

  const file =
    asset === "backdrop" || asset === "character" || asset === "emblem"
      ? `${prefix}-${asset}`
      : asset === "button"
        ? `${prefix}-button`
        : asset === "buttonHover"
          ? `${prefix}-button-hover`
          : ELEMENT_FILES[faction][asset];

  return `${FACTION_WAR_ASSETS_URL}/${warId}/${file}.webp`;
};

/** The plain plate behind secondary actions such as "Nie teraz". */
export const getFactionWarNeutralButtonUrl = (warId: string): string | null =>
  KNOWN_WAR_IDS.has(warId)
    ? `${FACTION_WAR_ASSETS_URL}/${warId}/neutral-button.webp`
    : null;

/** The fire and ice seam drawn between both halves of the pick screen. */
export const getFactionWarSeamUrl = (warId: string): string | null =>
  KNOWN_WAR_IDS.has(warId)
    ? `${FACTION_WAR_ASSETS_URL}/${warId}/clash-seam.webp`
    : null;

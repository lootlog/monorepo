import type { FactionWarFaction } from "@lootlog/domain/faction-war";

/**
 * Each war ships its own art under `public/faction-wars/<war id>/`, so a new
 * war only needs its files there.
 */
const getFactionWarArtBase = (warId: string) =>
  `/faction-wars/${encodeURIComponent(warId)}`;

export const getFactionWarSeamArt = (warId: string) =>
  `${getFactionWarArtBase(warId)}/clash-seam.webp`;

export const getFactionWarFactionArt = (
  warId: string,
  faction: FactionWarFaction,
) => {
  const prefix = `${getFactionWarArtBase(warId)}/${faction.toLowerCase()}`;

  return {
    /** 768×1152, transparent, facing the centre of the clash. */
    character: `${prefix}-character.webp`,
    /** 768×1152, opaque landscape. */
    backdrop: `${prefix}-backdrop.webp`,
    /** 256×256, transparent crest. */
    emblem: `${prefix}-emblem.webp`,
  };
};

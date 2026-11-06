import { t } from "@/i18n/messages";
import { isHeroTrackersMonster } from "@/lib/hero-trackers";

type SummarizedNpc = {
  type: string | null;
  icon: string | null;
  lvl: number | null;
};

/**
 * An NPC's kind as players name it: its type, or Tropiciele Herosów for a
 * hero fought in its hideout during the event.
 */
export const npcKind = (npc: Omit<SummarizedNpc, "lvl">) => {
  if (isHeroTrackersMonster(npc)) return t("npc.heroTrackers");

  return npc.type ? t(`npcTypes.${npc.type}`) : undefined;
};

/** An NPC's kind and level for a subtitle: `Heros · 271 lvl`. */
export const npcSummary = (npc: SummarizedNpc) =>
  [
    npcKind(npc),
    npc.lvl ? t("common.levelShort", { level: npc.lvl }) : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

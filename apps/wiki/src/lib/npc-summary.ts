import { t } from "@/i18n/messages";

/** An NPC's kind and level for a subtitle: `Heros · 271 lvl`. */
export const npcSummary = (npc: { type: string | null; lvl: number | null }) =>
  [
    npc.type ? t(`npcTypes.${npc.type}`) : undefined,
    npc.lvl ? t("common.levelShort", { level: npc.lvl }) : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

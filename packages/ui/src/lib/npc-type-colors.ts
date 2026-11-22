import {
  DEFAULT_NPC_TYPE_COLORS,
  type AppearanceNpcType,
} from "@lootlog/schema/npc-appearance";
import type { CSSProperties } from "react";

type NpcTypeColorStyle = CSSProperties & { "--npc-type": string };

export const npcTypeColorStyle = (
  type: AppearanceNpcType,
): NpcTypeColorStyle => ({ "--npc-type": DEFAULT_NPC_TYPE_COLORS[type] });

export const NPC_TYPE_TEXT_CLASS =
  "text-[color-mix(in_oklab,var(--npc-type)_60%,var(--foreground))]";

export const NPC_TYPE_SURFACE_CLASS = "bg-(--npc-type)/10";

export const NPC_TYPE_BADGE_CLASS = `${NPC_TYPE_SURFACE_CLASS} ${NPC_TYPE_TEXT_CLASS} border-(--npc-type)/20`;

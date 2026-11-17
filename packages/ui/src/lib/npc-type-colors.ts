import {
  DEFAULT_NPC_TYPE_COLORS,
  type AppearanceNpcType,
} from "@lootlog/schema/npc-appearance";
import type { CSSProperties } from "react";

type NpcTypeColorStyle = CSSProperties & { "--npc-type": string };

/**
 * Sets `--npc-type` to the colour the game client gives the type by default,
 * for the `NPC_TYPE_*` classes on the element and its descendants.
 */
export const npcTypeColorStyle = (
  type: AppearanceNpcType,
): NpcTypeColorStyle => ({ "--npc-type": DEFAULT_NPC_TYPE_COLORS[type] });

/** The type colour, mixed toward the foreground so it stays readable in both themes. */
export const NPC_TYPE_TEXT_CLASS =
  "text-[color-mix(in_oklab,var(--npc-type)_60%,var(--foreground))]";

export const NPC_TYPE_SURFACE_CLASS = "bg-(--npc-type)/10";

export const NPC_TYPE_BADGE_CLASS = `${NPC_TYPE_SURFACE_CLASS} ${NPC_TYPE_TEXT_CLASS} border-(--npc-type)/20`;

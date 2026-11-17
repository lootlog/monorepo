import type { ActivityFeedNpcCategory } from "@lootlog/domain/activity-feed";
import {
  NPC_TYPE_SURFACE_CLASS,
  NPC_TYPE_TEXT_CLASS,
  npcTypeColorStyle,
} from "@lootlog/ui/lib/npc-type-colors";
import type { CSSProperties } from "react";

/** Colors per NPC group. */
type NpcCategoryAppearance = {
  /** Text and icon color. */
  color: string;
  /** Tinted background behind an icon or label. */
  surface: string;
  /** Sets the colours on an element containing both. */
  style: CSSProperties | undefined;
};

/** NPC types take the colours the game client gives them; the rest stay muted. */
export const npcCategoryAppearance = (
  category: ActivityFeedNpcCategory,
): NpcCategoryAppearance =>
  category === "OTHER"
    ? { color: "text-muted-foreground", surface: "bg-muted", style: undefined }
    : {
        color: NPC_TYPE_TEXT_CLASS,
        surface: NPC_TYPE_SURFACE_CLASS,
        style: npcTypeColorStyle(category),
      };

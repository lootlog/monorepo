import type { ActivityFeedNpcCategory } from "@lootlog/domain/activity-feed";
import {
  NPC_TYPE_SURFACE_CLASS,
  NPC_TYPE_TEXT_CLASS,
  npcTypeColorStyle,
} from "@lootlog/ui/lib/npc-type-colors";
import type { CSSProperties } from "react";

type NpcCategoryAppearance = {
  color: string;
  surface: string;
  style: CSSProperties | undefined;
};

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

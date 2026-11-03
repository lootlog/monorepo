import type { ActivityFeedNpcCategory } from "@lootlog/domain/activity-feed";

/** Colors per NPC group. */
type NpcCategoryAppearance = {
  /** Text and icon color. */
  color: string;
  /** Tinted background behind an icon or label. */
  surface: string;
};

export const NPC_CATEGORY_APPEARANCE = {
  ELITE2: {
    color: "text-blue-500",
    surface: "bg-blue-500/10",
  },
  HERO: {
    color: "text-amber-500",
    surface: "bg-amber-500/10",
  },
  COLOSSUS: {
    color: "text-cyan-500",
    surface: "bg-cyan-500/10",
  },
  TITAN: {
    color: "text-red-500",
    surface: "bg-red-500/10",
  },
  OTHER: {
    color: "text-muted-foreground",
    surface: "bg-muted",
  },
} as const satisfies Record<ActivityFeedNpcCategory, NpcCategoryAppearance>;

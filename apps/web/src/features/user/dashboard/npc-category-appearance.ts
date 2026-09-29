import type { ActivityFeedNpcCategory } from "@lootlog/domain/activity-feed";

/** Colors per NPC group; the group key also names its `NpcTypeIcon`. */
type NpcCategoryAppearance = {
  /** Text and icon color. */
  color: string;
  /** Tinted background behind an icon or label. */
  surface: string;
  /** Solid marker, such as a timeline dot. */
  marker: string;
};

export const NPC_CATEGORY_APPEARANCE = {
  ELITE2: {
    color: "text-blue-500",
    surface: "bg-blue-500/10",
    marker: "border-blue-500 bg-blue-500",
  },
  HERO: {
    color: "text-amber-500",
    surface: "bg-amber-500/10",
    marker: "border-amber-500 bg-amber-500",
  },
  COLOSSUS: {
    color: "text-cyan-500",
    surface: "bg-cyan-500/10",
    marker: "border-cyan-500 bg-cyan-500",
  },
  TITAN: {
    color: "text-red-500",
    surface: "bg-red-500/10",
    marker: "border-red-500 bg-red-500",
  },
  OTHER: {
    color: "text-muted-foreground",
    surface: "bg-muted",
    marker: "border-muted-foreground bg-muted-foreground",
  },
} as const satisfies Record<ActivityFeedNpcCategory, NpcCategoryAppearance>;

export const KILL_SUMMARY_NPC_CATEGORIES = [
  "ELITE2",
  "HERO",
  "COLOSSUS",
  "TITAN",
] as const satisfies ReadonlyArray<ActivityFeedNpcCategory>;

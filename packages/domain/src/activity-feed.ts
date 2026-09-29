import { NpcTypeEnum, NpcTypeSchema } from "@lootlog/schema/npc-type";
import { Option, Schema } from "effect";

/** NPC groups a reader can hide from the activity feed. */
export const ACTIVITY_FEED_NPC_CATEGORIES = [
  "ELITE2",
  "HERO",
  "COLOSSUS",
  "TITAN",
  "OTHER",
] as const;

export type ActivityFeedNpcCategory =
  (typeof ACTIVITY_FEED_NPC_CATEGORIES)[number];

export const ActivityFeedNpcCategorySchema = Schema.Literals(
  ACTIVITY_FEED_NPC_CATEGORIES,
);

const CATEGORY_BY_NPC_TYPE: Record<NpcTypeEnum, ActivityFeedNpcCategory> = {
  COMMON: "OTHER",
  ELITE: "OTHER",
  ELITE2: "ELITE2",
  ELITE3: "OTHER",
  HERO: "HERO",
  EVENT_HERO: "HERO",
  COLOSSUS: "COLOSSUS",
  TITAN: "TITAN",
  NPC: "OTHER",
};

const isNpcType = Schema.is(NpcTypeSchema);

export const activityFeedNpcCategory = (
  npcType: string | null | undefined,
): ActivityFeedNpcCategory =>
  isNpcType(npcType) ? CATEGORY_BY_NPC_TYPE[npcType] : "OTHER";

/** Every stored NPC type that belongs to one of the given categories. */
export const activityFeedNpcTypes = (
  categories: ReadonlyArray<ActivityFeedNpcCategory>,
): NpcTypeEnum[] =>
  Object.values(NpcTypeEnum).filter((type) =>
    categories.includes(CATEGORY_BY_NPC_TYPE[type]),
  );

/**
 * The Game client reports a kill and its loot as two submissions without a
 * shared identifier. A loot belongs to the kill of its strongest NPC on the
 * same world when it is recorded inside this window around that kill; party
 * loot distribution can finish a while after the fight.
 */
export const ACTIVITY_FEED_LOOT_BEFORE_KILL_MS = 30_000;

export const ACTIVITY_FEED_LOOT_AFTER_KILL_MS = 120_000;

type FeedOccurrence = {
  readonly world: string;
  readonly npcId: number;
  readonly occurredAt: number;
};

/** Distance used to pick the closest kill, or undefined when they are unrelated. */
export const lootDistanceFromKill = (
  kill: FeedOccurrence,
  loot: FeedOccurrence,
): number | undefined => {
  if (kill.world !== loot.world || kill.npcId !== loot.npcId) return undefined;

  const offset = loot.occurredAt - kill.occurredAt;

  if (
    offset < -ACTIVITY_FEED_LOOT_BEFORE_KILL_MS ||
    offset > ACTIVITY_FEED_LOOT_AFTER_KILL_MS
  )
    return undefined;

  return Math.abs(offset);
};

/** The reader's feed preferences, stored under `general.activityFeed`. */
export const ActivityFeedSettingsSchema = Schema.Struct({
  excludedGuildIds: Schema.Array(Schema.String),
  excludedNpcCategories: Schema.Array(ActivityFeedNpcCategorySchema),
  withLootOnly: Schema.Boolean,
  paused: Schema.Boolean,
});

export type ActivityFeedSettings = typeof ActivityFeedSettingsSchema.Type;

export const DEFAULT_ACTIVITY_FEED_SETTINGS: ActivityFeedSettings = {
  excludedGuildIds: [],
  excludedNpcCategories: [],
  withLootOnly: false,
  paused: false,
};

/** Parses resolved `general.activityFeed` settings; defaults until they load. */
export const parseActivityFeedSettings = (
  value: unknown,
): ActivityFeedSettings =>
  Option.getOrElse(
    Schema.decodeUnknownOption(ActivityFeedSettingsSchema)(value),
    () => DEFAULT_ACTIVITY_FEED_SETTINGS,
  );

import { Schema } from "effect";
import { UserFeedItem } from "@lootlog/protocol/feed";
import { ActivityFeedNpcCategorySchema } from "@lootlog/domain/activity-feed";

/** Reader filters; omitted filters include everything the caller can read. */
export const UserFeedQuery = Schema.Struct({
  excludedGuildIds: Schema.optionalKey(Schema.Array(Schema.String)),
  excludedNpcCategories: Schema.optionalKey(
    Schema.Array(ActivityFeedNpcCategorySchema),
  ),
  withLootOnly: Schema.optionalKey(Schema.Boolean),
});

export type UserFeedQuery = typeof UserFeedQuery.Type;

export const UserFeedResponse = Schema.Struct({
  generatedAt: Schema.String,
  windowStart: Schema.String,
  items: Schema.Array(UserFeedItem),
}).annotate({ identifier: "UserFeedResponseDto_Output" });

export type UserFeedResponse = typeof UserFeedResponse.Type;

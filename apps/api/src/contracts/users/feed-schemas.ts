import { Schema } from "effect";
import { UserFeedItem } from "@lootlog/protocol/feed";

export const UserFeedResponse = Schema.Struct({
  generatedAt: Schema.String,
  windowStart: Schema.String,
  items: Schema.Array(UserFeedItem),
}).annotate({ identifier: "UserFeedResponseDto_Output" });
export type UserFeedResponse = typeof UserFeedResponse.Type;

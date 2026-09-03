import { Schema } from "effect";
import { isoDatetimeCodec } from "./response-codecs.js";

const LootCommentMemberRoleResponse = Schema.Struct({
  color: Schema.optionalKey(Schema.NullOr(Schema.Number)),
});

const LootCommentMemberResponse = Schema.Struct({
  name: Schema.String,
  avatar: Schema.optionalKey(Schema.NullOr(Schema.String)),
  userId: Schema.String,
  roles: Schema.optionalKey(Schema.Array(LootCommentMemberRoleResponse)),
});

export const LootCommentResponse = Schema.Struct({
  id: Schema.Number,
  lootId: Schema.Number,
  guildId: Schema.String,
  content: Schema.String,
  member: LootCommentMemberResponse,
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});
export type LootCommentResponse = typeof LootCommentResponse.Type;

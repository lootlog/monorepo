import { IsoDateTime } from "@lootlog/schema/primitives";
import { Schema } from "effect";

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
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

export type LootCommentResponse = typeof LootCommentResponse.Type;

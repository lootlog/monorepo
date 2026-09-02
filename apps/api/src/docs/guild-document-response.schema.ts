import { Schema } from "effect";
import { isoDatetimeCodec } from "#src/shared/schema/response-codecs";
import { GuildDocumentContentSchema } from "./guild-document-content.schema.js";

const GuildDocumentEditor = Schema.Struct({
  memberId: Schema.String,
  name: Schema.NullOr(Schema.String),
});

const GuildDocumentListItem = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  title: Schema.String,
  version: Schema.Number,
  createdByMemberId: Schema.String,
  createdBy: GuildDocumentEditor,
  updatedByMemberId: Schema.String,
  updatedBy: GuildDocumentEditor,
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});

const GuildDocumentTrashItem = Schema.Struct({
  ...GuildDocumentListItem.fields,
  deletedAt: isoDatetimeCodec,
  deletedByMemberId: Schema.String,
  deletedBy: GuildDocumentEditor,
});

export const GuildDocumentListResponse = Schema.Struct({
  items: Schema.Array(GuildDocumentListItem),
  limit: Schema.Struct({
    canCreate: Schema.Boolean,
    max: Schema.Number,
    trashed: Schema.Number,
    used: Schema.Number,
  }),
});

export const GuildDocumentTrashResponse = Schema.Struct({
  items: Schema.Array(GuildDocumentTrashItem),
});

export const GuildDocumentResponse = Schema.Struct({
  ...GuildDocumentListItem.fields,
  content: GuildDocumentContentSchema,
});

const GuildDocumentHistoryItem = Schema.Struct({
  id: Schema.String,
  documentId: Schema.String,
  guildId: Schema.String,
  version: Schema.Number,
  title: Schema.String,
  action: Schema.Literals(["SAVE", "DELETE", "RESTORE"]),
  actorMemberId: Schema.String,
  actor: GuildDocumentEditor,
  editedAt: isoDatetimeCodec,
});

export const GuildDocumentHistoryResponse = Schema.Struct({
  items: Schema.Array(GuildDocumentHistoryItem),
});

export const GuildDocumentHistorySnapshotResponse = Schema.Struct({
  ...GuildDocumentHistoryItem.fields,
  content: GuildDocumentContentSchema,
});

export const DocsMutationResponse = Schema.Struct({ success: Schema.Boolean });

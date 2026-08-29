import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { isoDatetimeCodec } from "#src/shared/dto/zod-response-codecs";
import { GuildDocumentContentSchema } from "./guild-document-content.schema.js";

const GuildDocumentEditorSchema = z.object({
  memberId: z.string(),
  name: z.string().nullable(),
});

const GuildDocumentListItemSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  title: z.string(),
  version: z.number(),
  createdByMemberId: z.string(),
  createdBy: GuildDocumentEditorSchema,
  updatedByMemberId: z.string(),
  updatedBy: GuildDocumentEditorSchema,
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});

const GuildDocumentTrashItemSchema = GuildDocumentListItemSchema.extend({
  deletedAt: isoDatetimeCodec,
  deletedByMemberId: z.string(),
  deletedBy: GuildDocumentEditorSchema,
});

const GuildDocumentLimitSchema = z.object({
  canCreate: z.boolean(),
  max: z.number(),
  trashed: z.number(),
  used: z.number(),
});

const GuildDocumentListResponseSchema = z.object({
  items: z.array(GuildDocumentListItemSchema),
  limit: GuildDocumentLimitSchema,
});

const GuildDocumentTrashResponseSchema = z.object({
  items: z.array(GuildDocumentTrashItemSchema),
});

const GuildDocumentResponseSchema = GuildDocumentListItemSchema.extend({
  content: GuildDocumentContentSchema,
});

const GuildDocumentHistoryItemSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  guildId: z.string(),
  version: z.number(),
  title: z.string(),
  action: z.enum(["SAVE", "DELETE", "RESTORE"]),
  actorMemberId: z.string(),
  actor: GuildDocumentEditorSchema,
  editedAt: isoDatetimeCodec,
});

const GuildDocumentHistoryResponseSchema = z.object({
  items: z.array(GuildDocumentHistoryItemSchema),
});

const GuildDocumentHistorySnapshotResponseSchema =
  GuildDocumentHistoryItemSchema.extend({
    content: GuildDocumentContentSchema,
  });

const DocsMutationResponseSchema = z.object({
  success: z.boolean(),
});

export class GuildDocumentListItemResponseDto extends createZodDto(
  GuildDocumentListItemSchema,
  {
    codec: true,
  },
) {}

export class GuildDocumentTrashItemResponseDto extends createZodDto(
  GuildDocumentTrashItemSchema,
  {
    codec: true,
  },
) {}

export class GuildDocumentListResponseDto extends createZodDto(
  GuildDocumentListResponseSchema,
  {
    codec: true,
  },
) {}

export class GuildDocumentTrashResponseDto extends createZodDto(
  GuildDocumentTrashResponseSchema,
  {
    codec: true,
  },
) {}

export class GuildDocumentResponseDto extends createZodDto(
  GuildDocumentResponseSchema,
  {
    codec: true,
  },
) {}

export class GuildDocumentHistoryItemResponseDto extends createZodDto(
  GuildDocumentHistoryItemSchema,
  {
    codec: true,
  },
) {}

export class GuildDocumentHistoryResponseDto extends createZodDto(
  GuildDocumentHistoryResponseSchema,
  {
    codec: true,
  },
) {}

export class GuildDocumentHistorySnapshotResponseDto extends createZodDto(
  GuildDocumentHistorySnapshotResponseSchema,
  {
    codec: true,
  },
) {}

export class DocsMutationResponseDto extends createZodDto(
  DocsMutationResponseSchema,
  {
    codec: true,
  },
) {}

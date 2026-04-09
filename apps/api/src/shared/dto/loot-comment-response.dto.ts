import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { isoDatetimeCodec } from "./zod-response-codecs";

const LootCommentMemberRoleResponseSchema = z.object({
  color: z.number().nullable().optional(),
});

const LootCommentMemberResponseSchema = z.object({
  name: z.string(),
  avatar: z.string().nullable().optional(),
  userId: z.string(),
  roles: z.array(LootCommentMemberRoleResponseSchema).optional(),
});

const LootCommentResponseSchema = z.object({
  id: z.number(),
  lootId: z.number(),
  content: z.string(),
  member: LootCommentMemberResponseSchema.optional(),
  createdAt: isoDatetimeCodec,
});

export class LootCommentResponseDto extends createZodDto(
  LootCommentResponseSchema,
  {
    codec: true,
  },
) {}

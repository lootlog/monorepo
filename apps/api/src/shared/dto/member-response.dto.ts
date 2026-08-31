import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { MemberType } from "#src/db/domain";
import {
  isoDatetimeCodec,
  nullableIsoDatetimeCodec,
} from "#src/shared/dto/zod-response-codecs";
import { RoleResponseDto } from "./role-response.dto.js";

const MemberResponseSchema = z.object({
  id: z.number(),
  userId: z.string(),
  guildId: z.string(),
  type: z.nativeEnum(MemberType),
  name: z.string(),
  avatar: z.string().nullable().optional(),
  banner: z.string().nullable().optional(),
  active: z.boolean(),
  roles: z.array(RoleResponseDto.schema),
  globalUserId: z.string().nullable().optional(),
  lastDiscordSyncAt: nullableIsoDatetimeCodec.optional(),
  lastDiscordAttemptAt: nullableIsoDatetimeCodec.optional(),
  lastDiscordStatus: z.string().nullable().optional(),
  isStale: z.boolean().optional(),
  staleWarning: z.string().optional(),
  refreshQueued: z.boolean().optional(),
  nextRefreshAt: nullableIsoDatetimeCodec.optional(),
  updatedAt: isoDatetimeCodec,
});

export class MemberResponseDto extends createZodDto(MemberResponseSchema, {
  codec: true,
}) {}

export class NullableMemberResponseDto extends createZodDto(
  MemberResponseSchema.nullable(),
  {
    codec: true,
  },
) {}

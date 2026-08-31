import { db as prismaDb } from "#src/prisma/db";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import {
  isoDatetimeCodec,
  nullableIsoDatetimeCodec,
} from "#src/shared/dto/zod-response-codecs";

const RefreshJobStatus = prismaDb.nativeEnums.public.RefreshJobStatus.members;
type RefreshJobStatus =
  (typeof RefreshJobStatus)[keyof typeof RefreshJobStatus];

const MemberRefreshJobResponseSchema = z.object({
  id: z.number(),
  guildId: z.string(),
  status: z.nativeEnum(RefreshJobStatus),
  totalMembers: z.number(),
  processedMembers: z.number(),
  failedMembers: z.number(),
  createdAt: isoDatetimeCodec,
  nextAvailableAt: isoDatetimeCodec,
  completedAt: nullableIsoDatetimeCodec.optional(),
});

export class MemberRefreshJobResponseDto extends createZodDto(
  MemberRefreshJobResponseSchema,
  {
    codec: true,
  },
) {}

export class NullableMemberRefreshJobResponseDto extends createZodDto(
  MemberRefreshJobResponseSchema.nullable(),
  {
    codec: true,
  },
) {}

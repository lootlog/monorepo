import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { RefreshJobStatus } from "src/generated/prisma/client";
import {
  isoDatetimeCodec,
  nullableIsoDatetimeCodec,
} from "src/shared/dto/zod-response-codecs";

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

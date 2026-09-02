import { createZodDto } from "nestjs-zod";
import * as z from "zod";
import {
  isoDatetimeCodec,
  nullableIsoDatetimeCodec,
} from "#src/shared/dto/zod-response-codecs";

const MemberRefreshJobResponseSchema = z.object({
  id: z.number(),
  guildId: z.string(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
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

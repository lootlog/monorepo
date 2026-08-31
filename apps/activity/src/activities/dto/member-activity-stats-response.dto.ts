import { createZodDto, type ZodDto } from "nestjs-zod";
import { z } from "zod";
import { ActivitySource } from "../../shared/db/domain.js";
import { isoDatetimeCodec } from "#src/shared/dto/zod-response-codecs";

const MemberActivityStatsResponseSchema = z.object({
  guildId: z.string(),
  discordId: z.string(),
  source: z.nativeEnum(ActivitySource),
  lastSeenAt: isoDatetimeCodec.nullable().optional(),
  visitCount: z.number(),
  activeSessionCount: z.number(),
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});

export type MemberActivityStatsResponse = z.output<
  typeof MemberActivityStatsResponseSchema
>;

const MemberActivityStatsResponseDtoBase: ZodDto<
  typeof MemberActivityStatsResponseSchema,
  true
> = createZodDto(MemberActivityStatsResponseSchema, {
  codec: true,
});

export class MemberActivityStatsResponseDto extends MemberActivityStatsResponseDtoBase {}

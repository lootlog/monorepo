import { createZodDto } from "nestjs-zod";
import * as z from "zod";

const CreateAutoTimerSubmittedGuildSchema = z.object({
  guildId: z.string(),
  guildName: z.string(),
});

const CreateAutoTimerRejectedGuildReasonSchema = z.enum([
  "NOT_ON_CATCHING_WHITELIST",
  "TIMER_CREATE_FAILED",
]);

const CreateAutoTimerRejectedGuildSchema = z.object({
  guildId: z.string(),
  guildName: z.string(),
  reason: CreateAutoTimerRejectedGuildReasonSchema,
});

const CreateAutoTimerResponseSchema = z.object({
  submittedGuilds: z.array(CreateAutoTimerSubmittedGuildSchema),
  rejectedGuilds: z.array(CreateAutoTimerRejectedGuildSchema),
});

export class CreateAutoTimerResponseDto extends createZodDto(
  CreateAutoTimerResponseSchema,
) {}

export type CreateAutoTimerSubmittedGuild = z.infer<
  typeof CreateAutoTimerSubmittedGuildSchema
>;
export type CreateAutoTimerRejectedGuildReason = z.infer<
  typeof CreateAutoTimerRejectedGuildReasonSchema
>;
export type CreateAutoTimerRejectedGuild = z.infer<
  typeof CreateAutoTimerRejectedGuildSchema
>;
export type CreateAutoTimerResponse = z.infer<
  typeof CreateAutoTimerResponseSchema
>;

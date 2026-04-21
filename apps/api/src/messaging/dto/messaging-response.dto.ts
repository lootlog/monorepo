import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const NotificationResponseSchema = z.object({
  notificationId: z.string().min(1),
  guildIds: z.array(z.string().min(1)),
});

const CancelPartyGatheringResponseSchema = z.object({
  success: z.boolean(),
  guildIds: z.array(z.string().min(1)),
});

export class NotificationResponseDto extends createZodDto(
  NotificationResponseSchema,
) {}

export class CancelPartyGatheringResponseDto extends createZodDto(
  CancelPartyGatheringResponseSchema,
) {}

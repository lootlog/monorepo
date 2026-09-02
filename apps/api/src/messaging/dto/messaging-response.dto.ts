import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";

const NotificationResponseSchema = z.object({
  notificationId: z.string().min(1),
  guildIds: z.array(z.string().min(1)),
});

const NotificationRateLimitResponseSchema = z.object({
  message: z.literal("NOTIFICATION_RATE_LIMITED"),
  retryAfterMs: z.number().int().positive(),
});

const CancelPartyGatheringResponseSchema = z.object({
  success: z.boolean(),
  guildIds: z.array(z.string().min(1)),
});

export class NotificationResponseDto extends createSchemaClass(
  NotificationResponseSchema,
) {}

export class NotificationRateLimitResponseDto extends createSchemaClass(
  NotificationRateLimitResponseSchema,
) {}

export class CancelPartyGatheringResponseDto extends createSchemaClass(
  CancelPartyGatheringResponseSchema,
) {}

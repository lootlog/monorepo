import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const NotificationSettingsSchema = z.object({
  show: z.boolean(),
  highlight: z.boolean(),
  ignoreOtherWorlds: z.boolean(),
  autoHideTimeout: z.number().min(0).optional(),
  guildIds: z.array(z.string()),
  sound: z.boolean(),
});

const NotificationsSettingsSchema = z.object({
  ELITE2: NotificationSettingsSchema,
  HERO: NotificationSettingsSchema,
  COLOSSUS: NotificationSettingsSchema,
  TITAN: NotificationSettingsSchema,
  message: NotificationSettingsSchema,
  "party-gathering": NotificationSettingsSchema,
});

const UserGameAccountPreferencesResponseSchema = z.object({
  accountId: z.string().min(1),
  notifications: NotificationsSettingsSchema,
  hasStoredPreferences: z.boolean(),
});

export class UserGameAccountPreferencesResponseDto extends createZodDto(
  UserGameAccountPreferencesResponseSchema,
) {}

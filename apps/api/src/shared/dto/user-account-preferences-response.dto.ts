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

const DetectorRoutingRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  minLevel: z.number().min(0).max(500),
  maxLevel: z.number().min(0).max(500),
  world: z.string().optional(),
  guildIds: z.array(z.string()),
});

const DetectorTypeSettingsSchema = z.object({
  detect: z.boolean(),
  autoSend: z.boolean(),
  notifyWindow: z.boolean(),
  highlight: z.boolean(),
  notifySound: z.boolean(),
});

const DetectorSettingsSchema = z.object({
  routingRules: z.array(DetectorRoutingRuleSchema),
  ELITE2: DetectorTypeSettingsSchema,
  HERO: DetectorTypeSettingsSchema,
  COLOSSUS: DetectorTypeSettingsSchema,
  TITAN: DetectorTypeSettingsSchema,
});

const UserGameAccountPreferencesResponseSchema = z.object({
  accountId: z.string().min(1),
  notifications: NotificationsSettingsSchema,
  detector: DetectorSettingsSchema,
  hasStoredNotifications: z.boolean(),
  hasStoredDetector: z.boolean(),
  hasStoredPreferences: z.boolean(),
});

export class UserGameAccountPreferencesResponseDto extends createZodDto(
  UserGameAccountPreferencesResponseSchema,
) {}

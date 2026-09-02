import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";

const PartialNotificationSettingsSchema = z.object({
  show: z.boolean().optional(),
  highlight: z.boolean().optional(),
  ignoreOtherWorlds: z.boolean().optional(),
  autoHideTimeout: z.number().min(0).optional(),
  guildIds: z.array(z.string()).optional(),
  sound: z.boolean().optional(),
});

const DetectorRoutingRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  minLevel: z.number().min(0).max(500),
  maxLevel: z.number().min(0).max(500),
  world: z.string().optional(),
  guildIds: z.array(z.string()),
});

const PartialDetectorTypeSettingsSchema = z.object({
  detect: z.boolean().optional(),
  autoSend: z.boolean().optional(),
  notifyWindow: z.boolean().optional(),
  highlight: z.boolean().optional(),
  notifySound: z.boolean().optional(),
});

const UpdateUserGameAccountPreferencesSchema = z.object({
  notifications: z
    .object({
      ELITE2: PartialNotificationSettingsSchema.optional(),
      HERO: PartialNotificationSettingsSchema.optional(),
      COLOSSUS: PartialNotificationSettingsSchema.optional(),
      TITAN: PartialNotificationSettingsSchema.optional(),
      message: PartialNotificationSettingsSchema.optional(),
      "party-gathering": PartialNotificationSettingsSchema.optional(),
    })
    .optional(),
  detector: z
    .object({
      routingRules: z.array(DetectorRoutingRuleSchema).optional(),
      ELITE2: PartialDetectorTypeSettingsSchema.optional(),
      HERO: PartialDetectorTypeSettingsSchema.optional(),
      COLOSSUS: PartialDetectorTypeSettingsSchema.optional(),
      TITAN: PartialDetectorTypeSettingsSchema.optional(),
    })
    .optional(),
  pings: z
    .object({
      enabled: z.boolean().optional(),
    })
    .optional(),
  airTags: z
    .object({
      enabled: z.boolean().optional(),
    })
    .optional(),
});

export class UpdateUserGameAccountPreferencesDto extends createSchemaClass(
  UpdateUserGameAccountPreferencesSchema,
) {}

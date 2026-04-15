import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const PartialNotificationSettingsSchema = z.object({
  show: z.boolean().optional(),
  highlight: z.boolean().optional(),
  ignoreOtherWorlds: z.boolean().optional(),
  autoHideTimeout: z.number().min(0).optional(),
  guildIds: z.array(z.string()).optional(),
  sound: z.boolean().optional(),
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
});

export class UpdateUserGameAccountPreferencesDto extends createZodDto(
  UpdateUserGameAccountPreferencesSchema,
) {}

import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const ClanSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
});

export class ClanDto extends createZodDto(ClanSchema) {}

const VolunteerCharacterSchema = z.object({
  lvl: z.number(),
  nick: z.string(),
  accountId: z.string(),
  characterId: z.string(),
  prof: z.string(),
  icon: z.string(),
  clan: ClanSchema.optional(),
});

export class VolunteerCharacterDto extends createZodDto(
  VolunteerCharacterSchema,
) {}

const VolunteerNotificationSchema = z.object({
  notificationId: z.string(),
  targetDiscordId: z.string(),
  volunteerDiscordId: z.string(),
  world: z.string(),
  character: VolunteerCharacterSchema,
});

export class VolunteerNotificationDto extends createZodDto(
  VolunteerNotificationSchema,
) {}

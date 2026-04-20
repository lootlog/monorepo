import { z } from "zod";

export const ClanSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
});

export type ClanDto = z.infer<typeof ClanSchema>;

export const VolunteerCharacterSchema = z.object({
  lvl: z.number(),
  nick: z.string(),
  accountId: z.string(),
  characterId: z.string(),
  prof: z.string(),
  icon: z.string(),
  clan: ClanSchema.optional(),
});

export type VolunteerCharacterDto = z.infer<typeof VolunteerCharacterSchema>;

export const VolunteerNotificationSchema = z.object({
  notificationId: z.string(),
  targetDiscordId: z.string(),
  volunteerDiscordId: z.string(),
  world: z.string(),
  character: VolunteerCharacterSchema,
});

export type VolunteerNotificationDto = z.infer<
  typeof VolunteerNotificationSchema
>;

import { z } from "zod";

export const ClanSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
});

export type ClanDto = z.infer<typeof ClanSchema>;

export const PartyGatheringCharacterSchema = z.object({
  lvl: z.number(),
  nick: z.string(),
  accountId: z.string(),
  characterId: z.string(),
  prof: z.string(),
  icon: z.string(),
  clan: ClanSchema.optional(),
});

export type PartyGatheringCharacterDto = z.infer<
  typeof PartyGatheringCharacterSchema
>;

export const SendPartyGatheringSchema = z.object({
  guildId: z.string(),
  discordId: z.string(),
  notificationId: z.string(),
  world: z.string(),
  createdAt: z.string(),
  character: PartyGatheringCharacterSchema,
  description: z.string().optional(),
  minLvl: z.number().optional(),
  maxLvl: z.number().optional(),
});

export type SendPartyGatheringDto = z.infer<typeof SendPartyGatheringSchema>;

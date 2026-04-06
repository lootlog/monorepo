import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const ClanSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
});

export class ClanDto extends createZodDto(ClanSchema) {}

const PartyGatheringCharacterSchema = z.object({
  lvl: z.number(),
  nick: z.string(),
  accountId: z.string(),
  characterId: z.string(),
  prof: z.string(),
  icon: z.string(),
  clan: ClanSchema.optional(),
});

export class PartyGatheringCharacterDto extends createZodDto(
  PartyGatheringCharacterSchema,
) {}

const SendPartyGatheringSchema = z.object({
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

export class SendPartyGatheringDto extends createZodDto(
  SendPartyGatheringSchema,
) {}

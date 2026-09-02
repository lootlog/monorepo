import * as z from "zod";
import { createZodDto } from "nestjs-zod";

const ClanSchema = z.object({
  id: z.number().optional(),
  name: z.string().max(255).optional(),
});

export const CharacterSchema = z.object({
  lvl: z.number(),
  nick: z.string().max(255).min(1),
  accountId: z.string().max(255).min(1),
  characterId: z.string().max(255).min(1),
  prof: z.string().max(100).min(1),
  icon: z.string().max(2048).min(1),
  clan: ClanSchema.optional(),
});

export class ClanDto extends createZodDto(ClanSchema) {}

export class CharacterDto extends createZodDto(CharacterSchema) {}

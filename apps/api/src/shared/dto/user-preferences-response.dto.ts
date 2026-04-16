import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const UserPreferencesResponseSchema = z.object({
  userId: z.string(),
  guildsOrder: z.array(z.string()),
  theme: z.string(),
  colorMode: z.string(),
  mutes: z.object({
    players: z.array(
      z.object({
        discordId: z.string().min(1),
        displayName: z.string(),
      }),
    ),
    npcs: z.array(
      z.object({
        npcKey: z.string().min(1),
        npcId: z.number().int(),
        name: z.string().min(1),
        npcType: z.enum(["ELITE2", "HERO", "COLOSSUS", "TITAN"]),
        lvl: z.number().int().min(1),
        prof: z.string().nullable(),
        icon: z.string().nullable(),
      }),
    ),
  }),
});

export class UserPreferencesResponseDto extends createZodDto(
  UserPreferencesResponseSchema,
) {}

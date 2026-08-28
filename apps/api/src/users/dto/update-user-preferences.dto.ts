import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const UpdateUserPreferencesSchema = z.object({
  guildsOrder: z
    .array(z.string())
    .nonempty()
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "guildsOrder must contain unique values",
    })
    .optional(),
  hiddenGuildIds: z
    .array(z.string().min(1))
    .refine((guildIds) => new Set(guildIds).size === guildIds.length, {
      message: "hiddenGuildIds must contain unique values",
    })
    .optional(),
  chatAppearance: z
    .object({
      npcLayout: z.enum(["tile", "inline"]).optional(),
      fontScalePercent: z.number().optional(),
      messageGapPx: z.number().optional(),
      showTimestamp: z.boolean().optional(),
      showGuildLabel: z.boolean().optional(),
      showNpcAvatar: z.boolean().optional(),
      showNpcLevel: z.boolean().optional(),
      showNpcLocationAndCoordinates: z.boolean().optional(),
    })
    .optional(),
  mutes: z
    .object({
      players: z
        .array(
          z.object({
            discordId: z.string().min(1),
            displayName: z.string(),
          }),
        )
        .optional(),
      npcs: z
        .array(
          z.object({
            npcKey: z.string().min(1),
            npcId: z.number().int(),
            name: z.string().min(1),
            npcType: z.enum(["ELITE2", "HERO", "COLOSSUS", "TITAN"]),
            lvl: z.number().int().min(1),
            prof: z.string().nullable(),
            icon: z.string().nullable(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export class UpdateUserPreferencesDto extends createZodDto(
  UpdateUserPreferencesSchema,
) {}

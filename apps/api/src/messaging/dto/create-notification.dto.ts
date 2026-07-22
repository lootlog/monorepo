import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { CharacterSchema } from "src/messaging/dto/shared-character.dto";

const NpcSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  location: z.string().min(1),
  lvl: z.number(),
  prof: z.string().optional(),
  wt: z.number(),
  hpp: z.number().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  icon: z.string().min(1),
  type: z.number(),
});

const CreateNotificationSchema = z
  .object({
    message: z.string().max(500).optional(),
    npc: NpcSchema.optional(),
    guildIds: z.array(z.string().max(50)).min(1).max(10),
    world: z.string().min(1).max(50),
    isGatheringParty: z.boolean().optional(),
    character: CharacterSchema.optional(),
  })
  .superRefine((notification, context) => {
    if (!notification.isGatheringParty) return;

    if (!notification.npc) {
      context.addIssue({
        code: "custom",
        message: "Party gathering notifications require an NPC",
        path: ["npc"],
      });
    }
    if (!notification.character) {
      context.addIssue({
        code: "custom",
        message: "Party gathering notifications require a character",
        path: ["character"],
      });
    }
  });

export class CreateNotificationDto extends createZodDto(
  CreateNotificationSchema,
) {}

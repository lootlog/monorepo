import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { TimerActorCharacterSchema } from "#src/timers/dto/timer-actor-character.schema";

const CreateManualTimerSchema = z.object({
  name: z.string().min(1).max(50),
  minSeconds: z.number().min(1).optional(),
  maxSeconds: z.number().min(1).optional(),
  lvl: z.number().optional(),
  prof: z.string().optional(),
  type: z
    .enum([NpcType.ELITE2, NpcType.ELITE3, NpcType.HERO, NpcType.TITAN])
    .optional(),
  customMinSpawnTime: z.string().datetime().optional(),
  customMaxSpawnTime: z.string().datetime().optional(),
  world: z.string().min(1),
  actorCharacter: TimerActorCharacterSchema.optional(),
});

export class CreateManualTimerDto extends createSchemaClass(
  CreateManualTimerSchema,
) {}

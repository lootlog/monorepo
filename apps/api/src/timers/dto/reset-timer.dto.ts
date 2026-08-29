import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { TimerActorCharacterSchema } from "#src/timers/dto/timer-actor-character.schema";

const ResetTimerSchema = z.object({
  world: z.string().min(1),
  actorCharacter: TimerActorCharacterSchema.optional(),
});

export class ResetTimerDto extends createZodDto(ResetTimerSchema) {}

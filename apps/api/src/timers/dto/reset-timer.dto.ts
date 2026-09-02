import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";
import { TimerActorCharacterSchema } from "#src/timers/dto/timer-actor-character.schema";

const ResetTimerSchema = z.object({
  world: z.string().min(1),
  actorCharacter: TimerActorCharacterSchema.optional(),
});

export class ResetTimerDto extends createSchemaClass(ResetTimerSchema) {}

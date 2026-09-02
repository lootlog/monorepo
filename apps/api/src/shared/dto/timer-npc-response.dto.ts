import { createSchemaClass } from "#src/shared/validation/schema-class";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import * as z from "zod";

const TimerNpcResponseSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    prof: z.string(),
    location: z.string(),
    wt: z.string(),
    lvl: z.number(),
    type: z.nativeEnum(NpcType),
    icon: z.string().nullable(),
    margonemType: z.string(),
  })
  .meta({ id: "TimerNpcResponseDto" });

export class TimerNpcResponseDto extends createSchemaClass(
  TimerNpcResponseSchema,
) {}

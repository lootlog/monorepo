import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { NpcType } from "#src/db/domain";

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

export class TimerNpcResponseDto extends createZodDto(TimerNpcResponseSchema) {}

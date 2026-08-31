import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../../prisma/contract.js";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["NpcType"]["values"][number];

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

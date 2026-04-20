import { createZodDto, type ZodDto } from "nestjs-zod";
import { z } from "zod";

export const npcHitSchema = z
  .object({
    id: z.number(),
    prof: z.string(),
    icon: z.string(),
    name: z.string(),
    lvl: z.number(),
    wt: z.number(),
    type: z.string(),
    margonemType: z.number(),
    world: z.string(),
  })
  .describe("NPC search hit");

const NpcHitDtoBase: ZodDto<typeof npcHitSchema, false> =
  createZodDto(npcHitSchema);

export class NpcHitDto extends NpcHitDtoBase {}

const GetNpcsResponseSchema = z.array(npcHitSchema);

const GetNpcsResponseDtoBase: ZodDto<typeof GetNpcsResponseSchema, false> =
  createZodDto(GetNpcsResponseSchema);

export class GetNpcsResponseDto extends GetNpcsResponseDtoBase {}

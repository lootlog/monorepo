import * as z from "zod";
import { createZodDto } from "nestjs-zod";

const UpdateHeroSchema = z.object({
  npcName: z.string(),
  npcId: z.number().optional(),
});

export class UpdateHeroDto extends createZodDto(UpdateHeroSchema) {}

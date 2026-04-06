import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { HeroMapSchema } from "./create-event.dto";

const CreateHeroSchema = z.object({
  npcId: z.number().int().optional(),
  npcName: z.string(),
  maps: z.array(HeroMapSchema).optional(),
});

export class CreateHeroDto extends createZodDto(CreateHeroSchema) {}

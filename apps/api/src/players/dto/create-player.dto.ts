import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const CreatePlayerSchema = z.object({
  id: z.string(),
  characterId: z.number(),
  accountId: z.number(),
  name: z.string(),
  lvl: z.number(),
  prof: z.string(),
  icon: z.string(),
  world: z.string(),
});

export class CreatePlayerDto extends createZodDto(CreatePlayerSchema) {}

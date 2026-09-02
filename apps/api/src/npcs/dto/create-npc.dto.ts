import * as z from "zod";
import { createZodDto } from "nestjs-zod";

const CreateNpcSchema = z.object({
  id: z.number(),
  prof: z.string(),
  icon: z.string(),
  name: z.string(),
  lvl: z.number(),
  wt: z.number(),
  type: z.string(),
  margonemType: z.number(),
  world: z.string(),
});

export class CreateNpcDto extends createZodDto(CreateNpcSchema) {}

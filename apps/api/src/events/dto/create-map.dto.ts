import * as z from "zod";
import { createZodDto } from "nestjs-zod";

const CreateMapSchema = z.object({
  mapId: z.number().int(),
  mapName: z.string(),
});

export class CreateMapDto extends createZodDto(CreateMapSchema) {}

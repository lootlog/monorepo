import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const MapItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

const CreateMapTemplateSchema = z.object({
  name: z.string(),
  maps: z.array(MapItemSchema).nonempty(),
});

export class CreateMapTemplateDto extends createZodDto(
  CreateMapTemplateSchema,
) {}

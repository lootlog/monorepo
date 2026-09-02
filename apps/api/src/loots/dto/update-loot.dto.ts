import * as z from "zod";
import { createZodDto } from "nestjs-zod";

const UpdateLootSchema = z.object({
  msg: z.string(),
});

export class UpdateLootDto extends createZodDto(UpdateLootSchema) {}

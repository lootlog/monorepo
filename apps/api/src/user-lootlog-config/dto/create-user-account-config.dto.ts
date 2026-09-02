import * as z from "zod";
import { createZodDto } from "nestjs-zod";

const CreateOrUpdateLootlogCharacterConfigSchema = z.object({
  characterId: z.string().min(1),
  catchingGuildIds: z
    .array(z.string())
    .describe("Guild IDs used for catching-related actions"),
});

export class CreateOrUpdateLootlogCharacterConfigDto extends createZodDto(
  CreateOrUpdateLootlogCharacterConfigSchema,
) {}

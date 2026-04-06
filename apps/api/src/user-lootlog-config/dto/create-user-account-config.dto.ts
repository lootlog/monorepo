import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const CreateOrUpdateLootlogCharacterConfigSchema = z.object({
  lootGuildIds: z.array(z.string()),
  timerGuildIds: z.array(z.string()),
  characterId: z.string().min(1),
});

export class CreateOrUpdateLootlogCharacterConfigDto extends createZodDto(
  CreateOrUpdateLootlogCharacterConfigSchema,
) {}

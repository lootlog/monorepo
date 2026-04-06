import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const CreateUserLootlogConfigPlayerSchema = z.object({
  id: z.number(),
  name: z.string(),
  prof: z.string(),
  icon: z.string(),
  lvl: z.number(),
  canAddLoot: z.boolean(),
  canAddTimer: z.boolean(),
});

const CreateUserLootlogConfigSchema = z.object({
  guildId: z.string(),
  world: z.string(),
  accountId: z.number(),
  players: z.array(CreateUserLootlogConfigPlayerSchema),
});

export class CreateUserLootlogConfigDto extends createZodDto(
  CreateUserLootlogConfigSchema,
) {}

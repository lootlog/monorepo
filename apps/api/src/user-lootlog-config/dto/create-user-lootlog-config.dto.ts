import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { nonEmptyString } from "src/shared/zod/query-helpers";

const CreateUserLootlogConfigPlayerSchema = z.object({
  id: z.number(),
  name: nonEmptyString,
  prof: nonEmptyString,
  icon: nonEmptyString,
  lvl: z.number(),
  canAddLoot: z.boolean(),
  canAddTimer: z.boolean(),
});

const CreateUserLootlogConfigSchema = z.object({
  guildId: nonEmptyString,
  world: nonEmptyString,
  accountId: z.number(),
  players: z.array(CreateUserLootlogConfigPlayerSchema),
});

export class CreateUserLootlogConfigDto extends createZodDto(
  CreateUserLootlogConfigSchema,
) {}

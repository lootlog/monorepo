import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const CreateOrUpdateLootlogCharacterConfigSchema = z
  .object({
    characterId: z.string().min(1),
    catchingGuildIds: z
      .array(z.string())
      .optional()
      .describe("Guild IDs used for catching-related actions"),
    lootGuildIds: z
      .array(z.string())
      .optional()
      .describe("DEPRECATED: Use catchingGuildIds instead"),
    timerGuildIds: z
      .array(z.string())
      .optional()
      .describe("DEPRECATED: Use catchingGuildIds instead"),
  })
  .refine(
    (data) =>
      data.catchingGuildIds !== undefined ||
      data.lootGuildIds !== undefined ||
      data.timerGuildIds !== undefined,
    {
      message:
        "One of catchingGuildIds, lootGuildIds, or timerGuildIds must be provided",
      path: ["catchingGuildIds"],
    },
  );

export type CreateOrUpdateLootlogCharacterConfigInput = z.infer<
  typeof CreateOrUpdateLootlogCharacterConfigSchema
>;

export function resolveCatchingGuildIds(
  data: CreateOrUpdateLootlogCharacterConfigInput,
): string[] {
  if (data.catchingGuildIds !== undefined) {
    return data.catchingGuildIds;
  }

  return [...(data.lootGuildIds ?? []), ...(data.timerGuildIds ?? [])];
}

export class CreateOrUpdateLootlogCharacterConfigDto extends createZodDto(
  CreateOrUpdateLootlogCharacterConfigSchema,
) {}

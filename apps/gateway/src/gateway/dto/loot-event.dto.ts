import type {
  GuildLootCreatedEventV2,
  GuildLootShareUpdatedEventV2,
} from "@lootlog/types";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const LootSocketNpcSchema = z
  .object({
    lvl: z.number().nullable().optional(),
    prof: z.string().nullable().optional(),
    type: z.union([z.number(), z.string()]).nullable().optional(),
    wt: z.union([z.number(), z.string()]).nullable().optional(),
  })
  .strict();

export const LootCreateEventV2Schema = z
  .object({
    version: z.literal(2),
    guildId: z.string().min(1),
    lootId: z.number().int(),
    npcs: z.array(LootSocketNpcSchema).min(1),
  })
  .strict() satisfies z.ZodType<GuildLootCreatedEventV2>;

export class LootCreateEventV2Dto extends createZodDto(
  LootCreateEventV2Schema,
) {}

export const CompiledLootCreateEventV2Schema = z.compile(
  LootCreateEventV2Schema,
  { strict: true },
);

export const LootShareUpdateEventV2Schema = LootCreateEventV2Schema.extend({
  lootShare: z.record(z.string(), z.array(z.string())),
}) satisfies z.ZodType<GuildLootShareUpdatedEventV2>;

export class LootShareUpdateEventV2Dto extends createZodDto(
  LootShareUpdateEventV2Schema,
) {}

export const CompiledLootShareUpdateEventV2Schema = z.compile(
  LootShareUpdateEventV2Schema,
  { strict: true },
);

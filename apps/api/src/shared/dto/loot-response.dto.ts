import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { isoDatetimeCodec, jsonValueSchema } from "./zod-response-codecs";

const LootItemResponseSchema = z
  .object({
    id: z.number(),
    hid: z.string(),
    name: z.string(),
    icon: z.string(),
  })
  .passthrough();

const LootPlayerResponseSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
  })
  .passthrough();

const LootNpcResponseSchema = z
  .object({
    id: z.number(),
    name: z.string(),
  })
  .passthrough();

const LootResponseSchema = z.object({
  id: z.number(),
  world: z.string(),
  location: z.string(),
  items: z.array(LootItemResponseSchema),
  players: z.array(LootPlayerResponseSchema),
  npcs: z.array(LootNpcResponseSchema),
  lootShare: jsonValueSchema.nullable().optional(),
  createdAt: isoDatetimeCodec,
  commentsCount: z.number(),
});

export class LootResponseDto extends createZodDto(LootResponseSchema, {
  codec: true,
}) {}

export class NullableLootResponseDto extends createZodDto(
  LootResponseSchema.nullable(),
  {
    codec: true,
  },
) {}

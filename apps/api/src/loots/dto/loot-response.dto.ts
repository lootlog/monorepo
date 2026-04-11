import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { ItemRarity, NpcType } from "src/generated/prisma/client";

const CreateLootResponseSchema = z.object({
  id: z.number(),
});

export class CreateLootResponseDto extends createZodDto(
  CreateLootResponseSchema,
) {}

const LootShareResponseSchema = z.record(z.string(), z.array(z.string()));

export class LootShareResponseDto extends createZodDto(
  LootShareResponseSchema,
) {}

const LootStatsOverviewResponseSchema = z.object({
  totalLoots: z.number(),
  totalItems: z.number(),
  legendaryItems: z.number(),
  heroicItems: z.number(),
  avgItemLevel: z.number(),
});

const RarityStatsResponseSchema = z.object({
  count: z.number(),
  percentage: z.number(),
});

const TimelinePointResponseSchema = z.object({
  date: z.string(),
  total: z.number(),
  byRarity: z.record(z.string(), z.number()),
});

const TopNpcResponseSchema = z.object({
  npcId: z.number(),
  name: z.string(),
  type: z.nativeEnum(NpcType).nullable(),
  lvl: z.number().nullable(),
  icon: z.string().nullable(),
  count: z.number(),
  byRarity: z.record(z.string(), z.number()),
});

const TopContributorResponseSchema = z.object({
  memberId: z.number(),
  name: z.string(),
  avatar: z.string().nullable(),
  userId: z.string(),
  count: z.number(),
  byRarity: z.record(z.string(), z.number()),
});

const TopItemResponseSchema = z.object({
  itemId: z.number(),
  hid: z.string(),
  name: z.string(),
  icon: z.string(),
  rarity: z.nativeEnum(ItemRarity),
  lvl: z.number(),
  count: z.number(),
});

const LootStatsResponseSchema = z.object({
  overview: LootStatsOverviewResponseSchema,
  byRarity: z.record(z.string(), RarityStatsResponseSchema),
  timeline: z.array(TimelinePointResponseSchema),
  topNpcs: z.array(TopNpcResponseSchema),
  topContributors: z.array(TopContributorResponseSchema),
  topItems: z.array(TopItemResponseSchema),
});

export class LootStatsResponseDto extends createZodDto(
  LootStatsResponseSchema,
) {}

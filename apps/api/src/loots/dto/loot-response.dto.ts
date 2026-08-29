import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { ItemRarity, NpcType } from "#src/generated/prisma/client";

const CreateLootSubmittedGuildSchema = z.object({
  guildId: z.string(),
  guildName: z.string(),
});

const CreateLootRejectedGuildReasonSchema = z.enum([
  "NOT_ON_CHARACTER_WHITELIST",
  "MISSING_LOOTLOG_CONFIG",
  "LOOT_NOT_ACCEPTED_BY_CONFIG",
  "MISSING_MEMBER",
]);

const CreateLootRejectedGuildSchema = z.object({
  guildId: z.string(),
  guildName: z.string(),
  reason: CreateLootRejectedGuildReasonSchema,
});

const CreateLootResponseSchema = z.object({
  id: z.number(),
  submittedGuilds: z.array(CreateLootSubmittedGuildSchema),
  rejectedGuilds: z.array(CreateLootRejectedGuildSchema),
});

export class CreateLootResponseDto extends createZodDto(
  CreateLootResponseSchema,
) {}

export type CreateLootSubmittedGuild = z.infer<
  typeof CreateLootSubmittedGuildSchema
>;
export type CreateLootRejectedGuildReason = z.infer<
  typeof CreateLootRejectedGuildReasonSchema
>;
export type CreateLootRejectedGuild = z.infer<
  typeof CreateLootRejectedGuildSchema
>;
export type CreateLootResponse = z.infer<typeof CreateLootResponseSchema>;

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

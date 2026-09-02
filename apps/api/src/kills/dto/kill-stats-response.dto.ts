import { createZodDto } from "nestjs-zod";
import * as z from "zod";
import type { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";

const KillsByTypeResponseSchema = z.object({
  COMMON: z.number().optional(),
  ELITE: z.number().optional(),
  ELITE2: z.number().optional(),
  ELITE3: z.number().optional(),
  HERO: z.number().optional(),
  TITAN: z.number().optional(),
  COLOSSUS: z.number().optional(),
  NPC: z.number().optional(),
  EVENT_HERO: z.number().optional(),
});

export class KillsByTypeResponseDto extends createZodDto(
  KillsByTypeResponseSchema,
) {}

const GuildKillStatsOverviewResponseSchema = z.object({
  guildUniqueKills: z.number(),
  totalMemberParticipations: z.number(),
  killsByType: KillsByTypeResponseSchema.catchall(z.number()) as z.ZodType<
    Record<NpcType, number>
  >,
  participationsByType: KillsByTypeResponseSchema.catchall(
    z.number(),
  ) as z.ZodType<Record<NpcType, number>>,
});

export class GuildKillStatsOverviewResponseDto extends createZodDto(
  GuildKillStatsOverviewResponseSchema,
) {}

const UserKillStatsOverviewResponseSchema = z.object({
  totalKills: z.number(),
  killsByType: KillsByTypeResponseSchema.catchall(z.number()) as z.ZodType<
    Record<NpcType, number>
  >,
  killsByWorld: z.record(z.string(), z.number()),
});

export class UserKillStatsOverviewResponseDto extends createZodDto(
  UserKillStatsOverviewResponseSchema,
) {}

const MemberKillRankingResponseSchema = z.object({
  memberId: z.number(),
  memberName: z.string(),
  memberAvatar: z.string().nullable(),
  memberUserId: z.string(),
  totalParticipations: z.number(),
  participationsByType: KillsByTypeResponseSchema.catchall(
    z.number(),
  ) as z.ZodType<Record<NpcType, number>>,
});

export class MemberKillRankingResponseDto extends createZodDto(
  MemberKillRankingResponseSchema,
) {}

const GuildKillStatsResponseSchema = z.object({
  overview: GuildKillStatsOverviewResponseSchema,
  memberRanking: z.array(MemberKillRankingResponseSchema),
});

export class GuildKillStatsResponseDto extends createZodDto(
  GuildKillStatsResponseSchema,
) {}

const CreateKillResponseSchema = z.object({
  updated: z.number(),
  deduplicated: z.boolean().optional(),
});

export class CreateKillResponseDto extends createZodDto(
  CreateKillResponseSchema,
) {}

const TopNpcResponseSchema = z.object({
  npcId: z.number(),
  npcName: z.string(),
  npcType: z.string(),
  npcLvl: z.number(),
  npcIcon: z.string().nullable(),
  uniqueKills: z.number(),
});

export class TopNpcResponseDto extends createZodDto(TopNpcResponseSchema) {}

const UserTopNpcResponseSchema = z.object({
  npcId: z.number(),
  npcName: z.string(),
  npcType: z.string(),
  npcLvl: z.number(),
  npcIcon: z.string().nullable(),
  npcProf: z.string().nullable().optional(),
  totalKills: z.number(),
});

export class UserTopNpcResponseDto extends createZodDto(
  UserTopNpcResponseSchema,
) {}

const UserKillStatsResponseSchema = z.object({
  overview: UserKillStatsOverviewResponseSchema,
  topNpcs: z.array(UserTopNpcResponseSchema),
});

export class UserKillStatsResponseDto extends createZodDto(
  UserKillStatsResponseSchema,
) {}

const NpcKillResponseSchema = z.object({
  npcId: z.number(),
  npcName: z.string(),
  npcType: z.string(),
  npcLvl: z.number(),
  npcProf: z.string().nullable(),
  npcIcon: z.string().nullable(),
  totalKills: z.number(),
});

export class NpcKillResponseDto extends createZodDto(NpcKillResponseSchema) {}

const PaginationResponseSchema = z.object({
  total: z.number(),
  cursor: z.number(),
  limit: z.number(),
  hasNext: z.boolean(),
});

export class PaginationResponseDto extends createZodDto(
  PaginationResponseSchema,
) {}

const UserNpcKillsResponseSchema = z.object({
  npcs: z.array(NpcKillResponseSchema),
  pagination: PaginationResponseSchema,
});

export class UserNpcKillsResponseDto extends createZodDto(
  UserNpcKillsResponseSchema,
) {}

const GuildTopNpcsResponseSchema = z.object({
  topNpcs: z.array(TopNpcResponseSchema),
});

export class GuildTopNpcsResponseDto extends createZodDto(
  GuildTopNpcsResponseSchema,
) {}

const TopKillerResponseSchema = z.object({
  memberId: z.number(),
  memberName: z.string(),
  memberAvatar: z.string().nullable(),
  memberUserId: z.string(),
  totalParticipations: z.number(),
});

export class TopKillerResponseDto extends createZodDto(
  TopKillerResponseSchema,
) {}

const GuildTopKillersByTypeResponseSchema = z.object({
  TITAN: z.array(TopKillerResponseSchema).optional(),
  HERO: z.array(TopKillerResponseSchema).optional(),
  EVENT_HERO: z.array(TopKillerResponseSchema).optional(),
});

export class GuildTopKillersByTypeResponseDto extends createZodDto(
  GuildTopKillersByTypeResponseSchema,
) {}

const NpcInfoResponseSchema = z.object({
  npcId: z.number(),
  npcName: z.string(),
  npcType: z.string(),
  npcLvl: z.number(),
  npcProf: z.string().nullable(),
  npcIcon: z.string().nullable(),
  uniqueGuildKills: z.number(),
  totalMemberParticipations: z.number(),
});

export class NpcInfoResponseDto extends createZodDto(NpcInfoResponseSchema) {}

const NpcKillerResponseSchema = z.object({
  memberId: z.number(),
  memberName: z.string(),
  memberAvatar: z.string().nullable(),
  memberUserId: z.string(),
  participationCount: z.number(),
});

export class NpcKillerResponseDto extends createZodDto(
  NpcKillerResponseSchema,
) {}

const NpcKillersResponseSchema = z.object({
  npc: NpcInfoResponseSchema.nullable(),
  killers: z.array(NpcKillerResponseSchema),
});

export class NpcKillersResponseDto extends createZodDto(
  NpcKillersResponseSchema,
) {}

const MemberInfoResponseSchema = z.object({
  memberId: z.number(),
  memberName: z.string(),
  memberAvatar: z.string().nullable(),
  memberUserId: z.string(),
});

export class MemberInfoResponseDto extends createZodDto(
  MemberInfoResponseSchema,
) {}

const MemberKillsOverviewResponseSchema = z.object({
  totalParticipations: z.number(),
  participationsByType: z.record(z.string(), z.number()),
});

export class MemberKillsOverviewResponseDto extends createZodDto(
  MemberKillsOverviewResponseSchema,
) {}

const MemberKillsResponseSchema = z.object({
  member: MemberInfoResponseSchema.nullable(),
  overview: MemberKillsOverviewResponseSchema.nullable(),
  npcs: z.array(NpcKillResponseSchema),
  pagination: PaginationResponseSchema.nullable(),
});

export class MemberKillsResponseDto extends createZodDto(
  MemberKillsResponseSchema,
) {}

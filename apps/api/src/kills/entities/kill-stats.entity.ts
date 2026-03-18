import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import type { NpcType } from "generated/client";

export class KillsByTypeEntity {
  @Expose()
  @ApiProperty({ example: 10, description: "Number of COMMON kills" })
  COMMON?: number;

  @Expose()
  @ApiProperty({ example: 5, description: "Number of ELITE kills" })
  ELITE?: number;

  @Expose()
  @ApiProperty({ example: 3, description: "Number of ELITE2 kills" })
  ELITE2?: number;

  @Expose()
  @ApiProperty({ example: 2, description: "Number of ELITE3 kills" })
  ELITE3?: number;

  @Expose()
  @ApiProperty({ example: 8, description: "Number of HERO kills" })
  HERO?: number;

  @Expose()
  @ApiProperty({ example: 4, description: "Number of TITAN kills" })
  TITAN?: number;

  @Expose()
  @ApiProperty({ example: 1, description: "Number of COLOSSUS kills" })
  COLOSSUS?: number;

  @Expose()
  @ApiProperty({ example: 0, description: "Number of NPC kills" })
  NPC?: number;
}

export class GuildKillStatsOverviewEntity {
  @Expose()
  @ApiProperty({ example: 100, description: "Total unique kills by guild" })
  guildUniqueKills: number;

  @Expose()
  @ApiProperty({
    example: 150,
    description: "Total member participations (sum of all member kills)",
  })
  totalMemberParticipations: number;

  @Expose()
  @ApiProperty({
    type: KillsByTypeEntity,
    description: "Unique kills grouped by NPC type",
  })
  killsByType: Record<NpcType, number>;

  @Expose()
  @ApiProperty({
    type: KillsByTypeEntity,
    description: "Member participations grouped by NPC type",
  })
  participationsByType: Record<NpcType, number>;
}

export class UserKillStatsOverviewEntity {
  @Expose()
  @ApiProperty({ example: 100, description: "Total number of kills" })
  totalKills: number;

  @Expose()
  @ApiProperty({
    type: KillsByTypeEntity,
    description: "Kills grouped by NPC type",
  })
  killsByType: Record<NpcType, number>;

  @Expose()
  @ApiProperty({
    example: { tempest: 50, pandora: 30 },
    description: "Kills grouped by world",
  })
  killsByWorld: Record<string, number>;
}

export class MemberKillRankingEntity {
  @Expose()
  @ApiProperty({ example: 1, description: "Member ID" })
  memberId: number;

  @Expose()
  @ApiProperty({ example: "PlayerName", description: "Member name" })
  memberName: string;

  @Expose()
  @ApiProperty({
    example: "abc123",
    description: "Member Discord avatar hash",
    nullable: true,
  })
  memberAvatar: string | null;

  @Expose()
  @ApiProperty({ example: "123456789", description: "Member Discord user ID" })
  memberUserId: string;

  @Expose()
  @ApiProperty({
    example: 50,
    description: "Total participations by this member",
  })
  totalParticipations: number;

  @Expose()
  @ApiProperty({
    type: KillsByTypeEntity,
    description: "Participations grouped by NPC type",
  })
  participationsByType: Record<NpcType, number>;
}

export class GuildKillStatsEntity {
  @Expose()
  @ApiProperty({
    type: GuildKillStatsOverviewEntity,
    description: "Kill stats overview",
  })
  overview: GuildKillStatsOverviewEntity;

  @Expose()
  @ApiProperty({
    type: [MemberKillRankingEntity],
    description: "Member ranking by participations",
  })
  memberRanking: MemberKillRankingEntity[];
}

export class CreateKillResponseEntity {
  @Expose()
  @ApiProperty({ example: 3, description: "Number of guilds updated" })
  updated: number;
}

export class TopNpcEntity {
  @Expose()
  @ApiProperty({ example: 999, description: "NPC ID" })
  npcId: number;

  @Expose()
  @ApiProperty({ example: "Boss Name", description: "NPC name" })
  npcName: string;

  @Expose()
  @ApiProperty({ example: "HERO", description: "NPC type" })
  npcType: string;

  @Expose()
  @ApiProperty({ example: 300, description: "NPC level" })
  npcLvl: number;

  @Expose()
  @ApiProperty({
    example: "npc_icon.gif",
    description: "NPC icon",
    nullable: true,
  })
  npcIcon: string | null;

  @Expose()
  @ApiProperty({ example: 25, description: "Unique kills of this NPC" })
  uniqueKills: number;
}

export class UserTopNpcEntity {
  @Expose()
  @ApiProperty({ example: 999, description: "NPC ID" })
  npcId: number;

  @Expose()
  @ApiProperty({ example: "Boss Name", description: "NPC name" })
  npcName: string;

  @Expose()
  @ApiProperty({ example: "HERO", description: "NPC type" })
  npcType: string;

  @Expose()
  @ApiProperty({ example: 300, description: "NPC level" })
  npcLvl: number;

  @Expose()
  @ApiProperty({
    example: "npc_icon.gif",
    description: "NPC icon",
    nullable: true,
  })
  npcIcon: string | null;

  @Expose()
  @ApiProperty({ example: 25, description: "Total kills of this NPC" })
  totalKills: number;
}

export class UserKillStatsEntity {
  @Expose()
  @ApiProperty({
    type: UserKillStatsOverviewEntity,
    description: "Kill stats overview",
  })
  overview: UserKillStatsOverviewEntity;

  @Expose()
  @ApiProperty({
    type: [UserTopNpcEntity],
    description: "Top NPCs by kill count",
  })
  topNpcs: UserTopNpcEntity[];
}

export class NpcKillEntity {
  @Expose()
  @ApiProperty({ example: 999, description: "NPC ID" })
  npcId: number;

  @Expose()
  @ApiProperty({ example: "Boss Name", description: "NPC name" })
  npcName: string;

  @Expose()
  @ApiProperty({ example: "HERO", description: "NPC type" })
  npcType: string;

  @Expose()
  @ApiProperty({ example: 300, description: "NPC level" })
  npcLvl: number;

  @Expose()
  @ApiProperty({
    example: "w",
    description: "NPC profession",
    nullable: true,
  })
  npcProf: string | null;

  @Expose()
  @ApiProperty({
    example: "npc_icon.gif",
    description: "NPC icon",
    nullable: true,
  })
  npcIcon: string | null;

  @Expose()
  @ApiProperty({ example: 25, description: "Total kills of this NPC" })
  totalKills: number;
}

export class PaginationEntity {
  @Expose()
  @ApiProperty({ example: 100, description: "Total number of items" })
  total: number;

  @Expose()
  @ApiProperty({ example: 0, description: "Current cursor/offset" })
  cursor: number;

  @Expose()
  @ApiProperty({ example: 20, description: "Items per page" })
  limit: number;

  @Expose()
  @ApiProperty({ example: true, description: "Whether there are more items" })
  hasNext: boolean;
}

export class UserNpcKillsEntity {
  @Expose()
  @ApiProperty({
    type: [NpcKillEntity],
    description: "List of killed NPCs",
  })
  npcs: NpcKillEntity[];

  @Expose()
  @ApiProperty({
    type: PaginationEntity,
    description: "Pagination info",
  })
  pagination: PaginationEntity;
}

export class GuildTopNpcsEntity {
  @Expose()
  @ApiProperty({
    type: [TopNpcEntity],
    description: "Top NPCs by kill count in guild",
  })
  topNpcs: TopNpcEntity[];
}

export class TopKillerEntity {
  @Expose()
  @ApiProperty({ example: 1, description: "Member ID" })
  memberId: number;

  @Expose()
  @ApiProperty({ example: "PlayerName", description: "Member name" })
  memberName: string;

  @Expose()
  @ApiProperty({
    example: "abc123",
    description: "Member Discord avatar hash",
    nullable: true,
  })
  memberAvatar: string | null;

  @Expose()
  @ApiProperty({ example: "123456789", description: "Member Discord user ID" })
  memberUserId: string;

  @Expose()
  @ApiProperty({
    example: 50,
    description: "Total participations of this type",
  })
  totalParticipations: number;
}

export class GuildTopKillersByTypeEntity {
  @Expose()
  @ApiProperty({
    type: [TopKillerEntity],
    description: "Top TITAN killers",
  })
  TITAN?: TopKillerEntity[];

  @Expose()
  @ApiProperty({
    type: [TopKillerEntity],
    description: "Top HERO killers",
  })
  HERO?: TopKillerEntity[];

  @Expose()
  @ApiProperty({
    type: [TopKillerEntity],
    description: "Top EVENT_HERO killers",
  })
  EVENT_HERO?: TopKillerEntity[];
}

export class NpcInfoEntity {
  @Expose()
  @ApiProperty({ example: 999, description: "NPC ID" })
  npcId: number;

  @Expose()
  @ApiProperty({ example: "Boss Name", description: "NPC name" })
  npcName: string;

  @Expose()
  @ApiProperty({ example: "HERO", description: "NPC type" })
  npcType: string;

  @Expose()
  @ApiProperty({ example: 300, description: "NPC level" })
  npcLvl: number;

  @Expose()
  @ApiProperty({
    example: "w",
    description: "NPC profession",
    nullable: true,
  })
  npcProf: string | null;

  @Expose()
  @ApiProperty({
    example: "npc_icon.gif",
    description: "NPC icon",
    nullable: true,
  })
  npcIcon: string | null;

  @Expose()
  @ApiProperty({
    example: 50,
    description: "Unique kills of this NPC in guild",
  })
  uniqueGuildKills: number;

  @Expose()
  @ApiProperty({
    example: 75,
    description: "Total member participations for this NPC",
  })
  totalMemberParticipations: number;
}

export class NpcKillerEntity {
  @Expose()
  @ApiProperty({ example: 1, description: "Member ID" })
  memberId: number;

  @Expose()
  @ApiProperty({ example: "PlayerName", description: "Member name" })
  memberName: string;

  @Expose()
  @ApiProperty({
    example: "abc123",
    description: "Member Discord avatar hash",
    nullable: true,
  })
  memberAvatar: string | null;

  @Expose()
  @ApiProperty({ example: "123456789", description: "Member Discord user ID" })
  memberUserId: string;

  @Expose()
  @ApiProperty({
    example: 25,
    description: "Number of participations for this NPC",
  })
  participationCount: number;
}

export class NpcKillersResponseEntity {
  @Expose()
  @ApiProperty({
    type: NpcInfoEntity,
    description: "NPC information",
  })
  npc: NpcInfoEntity;

  @Expose()
  @ApiProperty({
    type: [NpcKillerEntity],
    description: "List of killers ranked by kill count",
  })
  killers: NpcKillerEntity[];
}

export class MemberInfoEntity {
  @Expose()
  @ApiProperty({ example: 1, description: "Member ID" })
  memberId: number;

  @Expose()
  @ApiProperty({ example: "PlayerName", description: "Member name" })
  memberName: string;

  @Expose()
  @ApiProperty({
    example: "abc123",
    description: "Member Discord avatar hash",
    nullable: true,
  })
  memberAvatar: string | null;

  @Expose()
  @ApiProperty({ example: "123456789", description: "Member Discord user ID" })
  memberUserId: string;
}

export class MemberKillsOverviewEntity {
  @Expose()
  @ApiProperty({
    example: 150,
    description: "Total participations by this member",
  })
  totalParticipations: number;

  @Expose()
  @ApiProperty({
    type: KillsByTypeEntity,
    description: "Participations grouped by NPC type",
  })
  participationsByType: Record<string, number>;
}

export class MemberKillsResponseEntity {
  @Expose()
  @ApiProperty({
    type: MemberInfoEntity,
    description: "Member information",
  })
  member: MemberInfoEntity;

  @Expose()
  @ApiProperty({
    type: MemberKillsOverviewEntity,
    description: "Overview statistics",
  })
  overview: MemberKillsOverviewEntity;

  @Expose()
  @ApiProperty({
    type: [NpcKillEntity],
    description: "List of NPCs killed by this member",
  })
  npcs: NpcKillEntity[];

  @Expose()
  @ApiProperty({
    type: PaginationEntity,
    description: "Pagination info",
  })
  pagination: PaginationEntity;
}

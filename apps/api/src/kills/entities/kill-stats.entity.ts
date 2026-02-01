import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import type { NpcType } from 'generated/client';

export class KillsByTypeEntity {
  @Expose()
  @ApiProperty({ example: 10, description: 'Number of COMMON kills' })
  COMMON?: number;

  @Expose()
  @ApiProperty({ example: 5, description: 'Number of ELITE kills' })
  ELITE?: number;

  @Expose()
  @ApiProperty({ example: 3, description: 'Number of ELITE2 kills' })
  ELITE2?: number;

  @Expose()
  @ApiProperty({ example: 2, description: 'Number of ELITE3 kills' })
  ELITE3?: number;

  @Expose()
  @ApiProperty({ example: 8, description: 'Number of HERO kills' })
  HERO?: number;

  @Expose()
  @ApiProperty({ example: 4, description: 'Number of TITAN kills' })
  TITAN?: number;

  @Expose()
  @ApiProperty({ example: 1, description: 'Number of COLOSSUS kills' })
  COLOSSUS?: number;

  @Expose()
  @ApiProperty({ example: 0, description: 'Number of NPC kills' })
  NPC?: number;
}

export class KillStatsOverviewEntity {
  @Expose()
  @ApiProperty({ example: 100, description: 'Total number of kills' })
  totalKills: number;

  @Expose()
  @ApiProperty({
    type: KillsByTypeEntity,
    description: 'Kills grouped by NPC type',
  })
  killsByType: Record<NpcType, number>;
}

export class UserKillStatsOverviewEntity extends KillStatsOverviewEntity {
  @Expose()
  @ApiProperty({
    example: { tempest: 50, pandora: 30 },
    description: 'Kills grouped by world',
  })
  killsByWorld: Record<string, number>;
}

export class MemberKillRankingEntity {
  @Expose()
  @ApiProperty({ example: 1, description: 'Member ID' })
  memberId: number;

  @Expose()
  @ApiProperty({ example: 'PlayerName', description: 'Member name' })
  memberName: string;

  @Expose()
  @ApiProperty({ example: 50, description: 'Total kills by this member' })
  totalKills: number;

  @Expose()
  @ApiProperty({
    type: KillsByTypeEntity,
    description: 'Kills grouped by NPC type',
  })
  killsByType: Record<NpcType, number>;
}

export class GuildKillStatsEntity {
  @Expose()
  @ApiProperty({
    type: KillStatsOverviewEntity,
    description: 'Kill stats overview',
  })
  overview: KillStatsOverviewEntity;

  @Expose()
  @ApiProperty({
    type: [MemberKillRankingEntity],
    description: 'Member ranking by kills',
  })
  memberRanking: MemberKillRankingEntity[];
}

export class CreateKillResponseEntity {
  @Expose()
  @ApiProperty({ example: 3, description: 'Number of guilds updated' })
  updated: number;
}

export class CharacterKillStatsEntity {
  @Expose()
  @ApiProperty({ example: 12345, description: 'Character ID' })
  characterId: number;

  @Expose()
  @ApiProperty({ example: 'PlayerName', description: 'Character name' })
  characterName: string;

  @Expose()
  @ApiProperty({ example: 500, description: 'Character level' })
  characterLvl: number;

  @Expose()
  @ApiProperty({
    example: 'w',
    description: 'Character profession shortname',
    nullable: true,
  })
  characterProf: string | null;

  @Expose()
  @ApiProperty({
    example: 'icon.gif',
    description: 'Character icon',
    nullable: true,
  })
  characterIcon: string | null;

  @Expose()
  @ApiProperty({ example: 100, description: 'Total kills by this character' })
  totalKills: number;

  @Expose()
  @ApiProperty({
    type: KillsByTypeEntity,
    description: 'Kills grouped by NPC type',
  })
  killsByType: Record<NpcType, number>;
}

export class TopNpcEntity {
  @Expose()
  @ApiProperty({ example: 999, description: 'NPC ID' })
  npcId: number;

  @Expose()
  @ApiProperty({ example: 'Boss Name', description: 'NPC name' })
  npcName: string;

  @Expose()
  @ApiProperty({ example: 'HERO', description: 'NPC type' })
  npcType: string;

  @Expose()
  @ApiProperty({ example: 300, description: 'NPC level' })
  npcLvl: number;

  @Expose()
  @ApiProperty({
    example: 'npc_icon.gif',
    description: 'NPC icon',
    nullable: true,
  })
  npcIcon: string | null;

  @Expose()
  @ApiProperty({ example: 25, description: 'Total kills of this NPC' })
  totalKills: number;
}

export class UserKillStatsEntity {
  @Expose()
  @ApiProperty({
    type: UserKillStatsOverviewEntity,
    description: 'Kill stats overview',
  })
  overview: UserKillStatsOverviewEntity;

  @Expose()
  @ApiProperty({
    type: [CharacterKillStatsEntity],
    description: 'Stats grouped by character',
  })
  characters: CharacterKillStatsEntity[];

  @Expose()
  @ApiProperty({
    type: [TopNpcEntity],
    description: 'Top NPCs by kill count',
  })
  topNpcs: TopNpcEntity[];
}

export class NpcKillEntity {
  @Expose()
  @ApiProperty({ example: 999, description: 'NPC ID' })
  npcId: number;

  @Expose()
  @ApiProperty({ example: 'Boss Name', description: 'NPC name' })
  npcName: string;

  @Expose()
  @ApiProperty({ example: 'HERO', description: 'NPC type' })
  npcType: string;

  @Expose()
  @ApiProperty({ example: 300, description: 'NPC level' })
  npcLvl: number;

  @Expose()
  @ApiProperty({
    example: 'w',
    description: 'NPC profession',
    nullable: true,
  })
  npcProf: string | null;

  @Expose()
  @ApiProperty({
    example: 'npc_icon.gif',
    description: 'NPC icon',
    nullable: true,
  })
  npcIcon: string | null;

  @Expose()
  @ApiProperty({ example: 25, description: 'Total kills of this NPC' })
  totalKills: number;
}

export class PaginationEntity {
  @Expose()
  @ApiProperty({ example: 100, description: 'Total number of items' })
  total: number;

  @Expose()
  @ApiProperty({ example: 0, description: 'Current cursor/offset' })
  cursor: number;

  @Expose()
  @ApiProperty({ example: 20, description: 'Items per page' })
  limit: number;

  @Expose()
  @ApiProperty({ example: true, description: 'Whether there are more items' })
  hasNext: boolean;
}

export class UserNpcKillsEntity {
  @Expose()
  @ApiProperty({
    type: [NpcKillEntity],
    description: 'List of killed NPCs',
  })
  npcs: NpcKillEntity[];

  @Expose()
  @ApiProperty({
    type: PaginationEntity,
    description: 'Pagination info',
  })
  pagination: PaginationEntity;
}

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

export class RecentKillParticipantEntity {
  @Expose()
  @ApiProperty({ example: 'PlayerName', description: 'Character name' })
  characterName: string;

  @Expose()
  @ApiProperty({ example: 150, description: 'Character level' })
  characterLvl: number;

  @Expose()
  @ApiProperty({ example: 'WARRIOR', description: 'Character profession' })
  characterProf?: string;
}

export class RecentKillEntity {
  @Expose()
  @ApiProperty({ example: 'cuid123', description: 'Kill ID' })
  killId: string;

  @Expose()
  @ApiProperty({ example: 'Boss Name', description: 'NPC name' })
  npcName: string;

  @Expose()
  @ApiProperty({ example: 'HERO', description: 'NPC type' })
  npcType: NpcType;

  @Expose()
  @ApiProperty({ example: 100, description: 'NPC level' })
  npcLvl: number;

  @Expose()
  @ApiProperty({ example: 'npc_icon.gif', description: 'NPC icon' })
  npcIcon?: string;

  @Expose()
  @ApiProperty({
    example: '2024-01-15T12:00:00Z',
    description: 'When the kill occurred',
  })
  killedAt: Date;

  @Expose()
  @ApiProperty({
    type: [RecentKillParticipantEntity],
    description: 'Kill participants',
  })
  participants: RecentKillParticipantEntity[];
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

  @Expose()
  @ApiProperty({ type: [RecentKillEntity], description: 'Recent kills' })
  recentKills: RecentKillEntity[];
}

export class CharacterKillStatsEntity {
  @Expose()
  @ApiProperty({ example: 12345, description: 'Character ID' })
  characterId: number;

  @Expose()
  @ApiProperty({ example: 50, description: 'Total kills by this character' })
  totalKills: number;

  @Expose()
  @ApiProperty({
    type: KillsByTypeEntity,
    description: 'Kills grouped by NPC type',
  })
  killsByType: Record<NpcType, number>;
}

export class PlayerKillStatsOverviewEntity extends KillStatsOverviewEntity {
  @Expose()
  @ApiProperty({
    example: { pandora: 50, berufs: 30 },
    description: 'Kills grouped by world',
  })
  killsByWorld: Record<string, number>;
}

export class PlayerKillStatsEntity {
  @Expose()
  @ApiProperty({
    type: PlayerKillStatsOverviewEntity,
    description: 'Player kill stats overview',
  })
  overview: PlayerKillStatsOverviewEntity;

  @Expose()
  @ApiProperty({
    type: [CharacterKillStatsEntity],
    description: 'Stats per character',
  })
  characters: CharacterKillStatsEntity[];
}

export class CreateKillResponseEntity {
  @Expose()
  @ApiProperty({ example: 'cuid123', description: 'Kill ID' })
  killId: string;

  @Expose()
  @ApiProperty({ example: true, description: 'Whether this was a new kill' })
  isNewKill: boolean;

  @Expose()
  @ApiProperty({ example: 'cuid456', description: 'Guild kill ID' })
  guildKillId: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type { NpcType } from 'generated/client';

export class GetGuildKillStatsDto {
  @ApiPropertyOptional({
    example: 'HERO,TITAN',
    description: 'Comma-separated NPC types to filter by',
  })
  @IsOptional()
  @IsString()
  npcType?: string;

  @ApiPropertyOptional({ example: 100, description: 'Minimum NPC level' })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : undefined))
  @IsNumber()
  @Min(0)
  minLvl?: number;

  @ApiPropertyOptional({ example: 200, description: 'Maximum NPC level' })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : undefined))
  @IsNumber()
  @Min(0)
  maxLvl?: number;

  parseNpcTypes(): NpcType[] | undefined {
    if (!this.npcType) return undefined;
    return this.npcType.split(',').map((t) => t.trim()) as NpcType[];
  }
}

export class GetUserKillStatsDto {
  @ApiPropertyOptional({
    example: 'HERO,TITAN',
    description: 'Comma-separated NPC types to filter by',
  })
  @IsOptional()
  @IsString()
  npcType?: string;

  @ApiPropertyOptional({
    example: 12345,
    description: 'Filter by character ID',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : undefined))
  @IsNumber()
  characterId?: number;

  @ApiPropertyOptional({
    example: 'pandora',
    description: 'Filter by world',
  })
  @IsOptional()
  @IsString()
  world?: string;

  parseNpcTypes(): NpcType[] | undefined {
    if (!this.npcType) return undefined;
    return this.npcType.split(',').map((t) => t.trim()) as NpcType[];
  }
}

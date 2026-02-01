import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { NpcType } from 'generated/client';

export class GetUserNpcKillsDto {
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

  @ApiPropertyOptional({
    example: 'Smok',
    description: 'Search NPC by name (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Offset for pagination',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : undefined))
  @IsNumber()
  @Min(0)
  cursor?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Limit number of results (default: 20, max: 100)',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : undefined))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Sort order (asc or desc, default: desc)',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    example: 'kills',
    description: 'Sort by field (kills or level, default: kills)',
  })
  @IsOptional()
  @IsIn(['kills', 'level'])
  sortBy?: 'kills' | 'level';

  @ApiPropertyOptional({
    example: 100,
    description: 'Minimum NPC level',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : undefined))
  @IsNumber()
  @Min(0)
  minLvl?: number;

  @ApiPropertyOptional({
    example: 300,
    description: 'Maximum NPC level',
  })
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

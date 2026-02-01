import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { NpcType } from 'generated/client';

export class GetMemberKillsDto {
  @ApiPropertyOptional({
    example: 'pandora',
    description: 'Filter by world',
  })
  @IsOptional()
  @IsString()
  world?: string;

  @ApiPropertyOptional({
    example: 'HERO,TITAN',
    description: 'Comma-separated NPC types to filter',
  })
  @IsOptional()
  @IsString()
  npcType?: string;

  @ApiPropertyOptional({
    example: 'Smok',
    description: 'Search NPC by name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 20,
    description: 'Limit number of NPCs to return (default: 20, max: 100)',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : undefined))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Cursor for pagination (default: 0)',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : undefined))
  @IsNumber()
  @Min(0)
  cursor?: number;

  parseNpcTypes(): NpcType[] | undefined {
    if (!this.npcType) {
      return undefined;
    }
    const types = this.npcType.split(',').map((t) => t.trim() as NpcType);
    const validTypes = Object.values(NpcType);
    return types.filter((t) => validTypes.includes(t));
  }
}

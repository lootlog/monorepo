import {
  IsOptional,
  IsString,
  IsIn,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryBattleStatisticsDto {
  @IsOptional()
  @IsString()
  characterId?: string;

  @IsOptional()
  @IsString()
  world?: string;

  @IsOptional()
  @IsString()
  @IsIn(['24h', '3d', '7d', '14d', '30d', '90d', '180d', 'all'])
  period?: '24h' | '3d' | '7d' | '14d' | '30d' | '90d' | '180d' | 'all';

  @IsOptional()
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsInt()
  @Min(1)
  minLevel?: number;

  @IsOptional()
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsInt()
  @Min(1)
  maxLevel?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsInt()
  @Min(1)
  size?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(['wins', 'losses', 'totalBattles', 'winRate', 'lastBattleDate'])
  sortBy?: 'wins' | 'losses' | 'totalBattles' | 'winRate' | 'lastBattleDate' =
    'totalBattles';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeTotal?: boolean = false;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsInt()
  @Min(1)
  minBattles?: number;
}

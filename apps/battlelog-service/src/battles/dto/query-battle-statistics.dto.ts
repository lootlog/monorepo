import { IsOptional, IsString, IsIn, IsBoolean } from 'class-validator';
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
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  sameLevelOnly?: boolean = false;
}

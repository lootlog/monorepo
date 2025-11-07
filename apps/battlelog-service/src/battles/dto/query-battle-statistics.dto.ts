import { IsOptional, IsString, IsIn } from 'class-validator';

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
}

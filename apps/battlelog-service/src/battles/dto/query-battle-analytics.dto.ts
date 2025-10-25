import { IsOptional, IsString, IsIn } from 'class-validator';

export class QueryBattleAnalyticsDto {
  @IsOptional()
  @IsString()
  characterId?: string; // If provided, analytics for specific character only

  @IsOptional()
  @IsString()
  world?: string; // Filter by world

  @IsOptional()
  @IsString()
  @IsIn(['24h', '3d', '7d', '14d', '30d', '90d', '180d'])
  period?: '24h' | '3d' | '7d' | '14d' | '30d' | '90d' | '180d'; // Time period filter
}

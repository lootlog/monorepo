import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ActivityType,
  ActivitySource,
} from '../../../prisma/generated/client';

export class QueryActivitiesDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  guildId?: string;

  @IsEnum(ActivityType)
  @IsOptional()
  type?: ActivityType;

  @IsEnum(ActivitySource)
  @IsOptional()
  source?: ActivitySource;

  @IsString()
  @IsOptional()
  playerName?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  cursor?: string;

  @Type(() => Number)
  @IsOptional()
  limit?: number = 50;
}

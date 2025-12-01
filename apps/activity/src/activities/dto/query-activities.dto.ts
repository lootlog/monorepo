import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityType } from '../../../prisma/generated/client';

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

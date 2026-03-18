import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { ActivityType, ActivitySource } from "../../../prisma/generated/client";

export class QueryActivitiesDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  guildId?: string;

  @IsArray()
  @IsEnum(ActivityType, { each: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  type?: ActivityType[];

  @IsArray()
  @IsEnum(ActivitySource, { each: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  source?: ActivitySource[];

  @IsString()
  @IsOptional()
  playerName?: string;

  @IsString()
  @IsOptional()
  clanName?: string;

  @IsString()
  @IsOptional()
  world?: string;

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
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 50;
}

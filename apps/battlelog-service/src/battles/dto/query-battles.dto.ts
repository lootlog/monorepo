import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryBattlesDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  size?: number = 20;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeTotal?: boolean = false;

  // Filters
  @IsOptional()
  @IsString()
  world?: string;

  @IsOptional()
  @IsArray()
  @IsIn(['solo', 'group'], { each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((v) => v.trim());
    return [value];
  })
  type?: Array<'solo' | 'group'>;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  public?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((v) => v.trim());
    return [value];
  })
  characterId?: Array<string>;

  @IsOptional()
  @IsString()
  search?: string; // For searching by warrior names

  @IsOptional()
  @IsArray()
  @IsIn(['won', 'lost', 'flee'], { each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((v) => v.trim());
    return [value];
  })
  result?: Array<'won' | 'lost' | 'flee'>; // Battle result filter

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  ph?: boolean; // Filter battles with honor points

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  matchmaking?: boolean; // Filter matchmaking battles (Otchłań)

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  minLevel?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxLevel?: number;
}

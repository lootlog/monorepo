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

export enum PaginationStrategy {
  OFFSET = 'offset',
  CURSOR = 'cursor',
  AUTO = 'auto',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  DURATION = 'duration',
  TYPE = 'type',
}

export class QueryBattlesDto {
  // Offset-based pagination
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // Cursor-based pagination
  @IsOptional()
  @IsString()
  cursor?: string; // Base64 encoded cursor

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  size?: number = 20; // For cursor-based pagination

  // Pagination strategy
  @IsOptional()
  @IsEnum(PaginationStrategy)
  strategy?: PaginationStrategy = PaginationStrategy.AUTO;

  // Sorting
  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField = SortField.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  // Performance options
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  estimateTotal?: boolean = false; // Use estimated counts for better performance

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeTotal?: boolean = true; // Skip total count entirely

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
}
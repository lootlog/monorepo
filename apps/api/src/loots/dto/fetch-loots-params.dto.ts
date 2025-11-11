import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MAX_PAGE_LIMIT } from '../config/pagination';

export class FetchLootsParamsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  limit: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cursor: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  npcs: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  players: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rarities: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  npcTypes: string[];

  @IsOptional()
  @IsString()
  world: string;
}

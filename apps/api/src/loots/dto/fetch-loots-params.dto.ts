import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  IsString,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { MAX_PAGE_LIMIT } from "../config/pagination";

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  npcLevelMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  npcLevelMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  itemLevelMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  itemLevelMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  playerLevelMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  playerLevelMax?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  hid?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemNames?: string[];

  @IsOptional()
  @IsDateString()
  createdAtMin?: string;

  @IsOptional()
  @IsDateString()
  createdAtMax?: string;
}

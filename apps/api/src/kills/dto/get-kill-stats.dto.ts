import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { NpcType } from "prisma/generated/client";
import type { TimeBucket } from "../utils/time-bucket";

export class GetGuildKillStatsDto {
  @ApiPropertyOptional({
    example: "all",
    description: "Time bucket filter",
    enum: ["24h", "3d", "7d", "30d", "all"],
  })
  @IsOptional()
  @IsIn(["24h", "3d", "7d", "30d", "all"])
  timeBucket?: TimeBucket;

  @ApiPropertyOptional({
    example: "HERO,TITAN",
    description: "Comma-separated NPC types to filter by",
    enum: NpcType,
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    return value
      .split(",")
      .map((v: string) => v.trim())
      .filter((v: string) => v.length > 0);
  })
  @IsEnum(NpcType, { each: true })
  npcTypes?: NpcType[];

  @ApiPropertyOptional({ example: 100, description: "Minimum NPC level" })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : undefined))
  @IsNumber()
  @Min(0)
  minLvl?: number;

  @ApiPropertyOptional({ example: 200, description: "Maximum NPC level" })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : undefined))
  @IsNumber()
  @Min(0)
  maxLvl?: number;

  @ApiPropertyOptional({
    example: "pandora",
    description: "Filter by world",
  })
  @IsOptional()
  @IsString()
  world?: string;
}

export class GetUserKillStatsDto {
  @ApiPropertyOptional({
    example: "all",
    description: "Time bucket filter",
    enum: ["24h", "3d", "7d", "30d", "all"],
  })
  @IsOptional()
  @IsIn(["24h", "3d", "7d", "30d", "all"])
  timeBucket?: TimeBucket;

  @ApiPropertyOptional({
    example: "HERO,TITAN",
    description: "Comma-separated NPC types to filter by",
    enum: NpcType,
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    return value
      .split(",")
      .map((v: string) => v.trim())
      .filter((v: string) => v.length > 0);
  })
  @IsEnum(NpcType, { each: true })
  npcTypes?: NpcType[];

  @ApiPropertyOptional({
    example: "HERO",
    description: "Single NPC type to filter by (alternative to npcTypes)",
    enum: NpcType,
  })
  @IsOptional()
  @IsEnum(NpcType)
  npcType?: NpcType;

  @ApiPropertyOptional({
    example: "pandora",
    description: "Filter by world",
  })
  @IsOptional()
  @IsString()
  world?: string;

  @ApiPropertyOptional({
    example: 5,
    description: "Limit number of top NPCs returned (default: 5)",
  })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : undefined))
  @IsNumber()
  @Min(1)
  topNpcsLimit?: number;
}

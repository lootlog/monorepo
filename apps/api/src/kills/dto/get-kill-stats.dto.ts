import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { NpcType } from "src/generated/prisma/client";
import {
  swaggerStringEnum,
  swaggerStringEnumArray,
} from "src/shared/swagger/prisma-enum";

export class GetGuildKillStatsDto {
  @ApiPropertyOptional({
    ...swaggerStringEnumArray("NpcType", NpcType),
    example: "HERO,TITAN",
    description: "Comma-separated NPC types to filter by",
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
    ...swaggerStringEnumArray("NpcType", NpcType),
    example: "HERO,TITAN",
    description: "Comma-separated NPC types to filter by",
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
    ...swaggerStringEnum("NpcType", NpcType),
    example: "HERO",
    description: "Single NPC type to filter by (alternative to npcTypes)",
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

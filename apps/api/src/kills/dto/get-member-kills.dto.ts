import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { NpcType } from "generated/client";

export class GetMemberKillsDto {
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

  @ApiPropertyOptional({
    example: "HERO,TITAN",
    description: "Comma-separated NPC types to filter",
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
    example: "Smok",
    description: "Search NPC by name",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 20,
    description: "Limit number of NPCs to return (default: 20, max: 100)",
  })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : undefined))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: 0,
    description: "Cursor for pagination (default: 0)",
  })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : undefined))
  @IsNumber()
  @Min(0)
  cursor?: number;
}

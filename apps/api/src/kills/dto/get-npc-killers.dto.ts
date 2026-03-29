import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import type { TimeBucket } from "../utils/time-bucket";

export class GetNpcKillersDto {
  @ApiPropertyOptional({
    example: "all",
    description: "Time bucket filter",
    enum: ["24h", "3d", "7d", "30d", "all"],
  })
  @IsOptional()
  @IsIn(["24h", "3d", "7d", "30d", "all"])
  timeBucket?: TimeBucket;

  @ApiPropertyOptional({
    example: 50,
    description: "Limit number of killers to return (default: 50, max: 100)",
  })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : undefined))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: "pandora",
    description: "Filter by world",
  })
  @IsOptional()
  @IsString()
  world?: string;
}

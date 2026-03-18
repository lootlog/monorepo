import { IsNumber, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateKillPointDto {
  @ApiProperty({
    description: "Signed manual delta to apply to this kill point",
  })
  @IsNumber({
    allowInfinity: false,
    allowNaN: false,
  })
  pointsDelta: number;

  @ApiProperty({
    description: "Optional comment describing the manual points edit",
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class UpdateRankingPointsDto {
  @ApiProperty({ description: "Signed manual delta to apply to this ranking" })
  @IsNumber({
    allowInfinity: false,
    allowNaN: false,
  })
  pointsDelta: number;

  @ApiProperty({
    description: "Optional comment describing the manual ranking edit",
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

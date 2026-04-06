import { IsString, IsOptional, IsNumber } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateHeroDto {
  @ApiProperty({ description: "NPC name" })
  @IsString()
  npcName: string;

  @ApiPropertyOptional({ description: "NPC ID" })
  @IsOptional()
  @IsNumber()
  npcId?: number;
}

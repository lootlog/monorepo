import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateHeroDto {
  @ApiProperty({ description: "NPC name" })
  @IsString()
  npcName: string;
}

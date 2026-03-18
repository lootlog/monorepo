import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString, IsNotEmpty } from "class-validator";

export class CreateOrUpdateLootlogCharacterConfigDto {
  @ApiProperty({
    type: [String],
    description: "List of guild IDs for loot collection",
  })
  @IsArray()
  lootGuildIds!: string[];

  @ApiProperty({
    type: [String],
    description: "List of guild IDs for timer management",
  })
  @IsArray()
  timerGuildIds!: string[];

  @ApiProperty({ description: "Character ID" })
  @IsString()
  @IsNotEmpty()
  characterId!: string;
}

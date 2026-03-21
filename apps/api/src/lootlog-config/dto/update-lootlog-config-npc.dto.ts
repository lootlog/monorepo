import { ItemRarity } from "prisma/generated/client";
import { IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateLootlogConfigNpcDto {
  @ApiProperty({
    description: "Array of allowed item rarities for this NPC type",
    example: ["UNIQUE", "HEROIC", "LEGENDARY"],
    enum: ItemRarity,
    isArray: true,
  })
  @IsEnum(ItemRarity, { each: true })
  allowedRarities: ItemRarity[];
}

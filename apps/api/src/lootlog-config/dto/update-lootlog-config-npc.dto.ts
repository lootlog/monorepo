import { ItemRarity } from "src/generated/prisma/client";
import { IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { swaggerStringEnumArray } from "src/shared/swagger/prisma-enum";

export class UpdateLootlogConfigNpcDto {
  @ApiProperty({
    ...swaggerStringEnumArray("ItemRarity", ItemRarity),
    description: "Array of allowed item rarities for this NPC type",
    example: ["UNIQUE", "HEROIC", "LEGENDARY"],
  })
  @IsEnum(ItemRarity, { each: true })
  allowedRarities: ItemRarity[];
}

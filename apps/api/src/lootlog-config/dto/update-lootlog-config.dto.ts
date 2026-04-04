import { ItemRarity, NpcType } from "src/generated/prisma/client";
import { IsArray, IsEnum } from "class-validator";

export class UpdateLootlogConfigDto {
  @IsArray({ each: true })
  npcs: UpdateLootlogConfigNpcsDto[];
}

export class UpdateLootlogConfigNpcsDto {
  @IsEnum(NpcType)
  npcType: NpcType;

  @IsEnum(ItemRarity, { each: true })
  allowedRarities: ItemRarity[];
}

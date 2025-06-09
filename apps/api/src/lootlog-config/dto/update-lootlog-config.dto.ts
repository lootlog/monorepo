import { ItemRarity, NpcType } from 'generated/client';
import { IsArray, IsEnum } from 'class-validator';

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

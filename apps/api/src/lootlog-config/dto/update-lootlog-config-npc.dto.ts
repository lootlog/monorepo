import { ItemRarity } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateLootlogConfigNpcDto {
  @IsEnum(ItemRarity, { each: true })
  allowedRarities: ItemRarity[];
}

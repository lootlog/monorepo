import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { NpcType, ItemRarity } from 'generated/client';

export class LootlogConfigNpcEntity {
  @Expose()
  @ApiProperty({ example: 1, description: 'Config NPC ID' })
  id: number;

  @Expose()
  @ApiProperty({
    example: 'TITAN',
    enum: NpcType,
    description: 'NPC type',
  })
  npcType: NpcType;

  @Expose()
  @ApiProperty({
    example: ['UNIQUE', 'HEROIC', 'LEGENDARY'],
    enum: ItemRarity,
    isArray: true,
    description: 'Allowed item rarities for this NPC type',
  })
  allowedRarities: ItemRarity[];

  @Exclude()
  lootlogConfigId: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}

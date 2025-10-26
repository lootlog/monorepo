import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LootSource } from 'generated/client';

export class LootEntity {
  @Expose()
  @ApiProperty({ example: 1, description: 'Loot ID' })
  id: number;

  @Expose()
  @ApiProperty({
    example: 'Zorza',
    description: 'World name',
  })
  world: string;

  @Expose()
  @ApiProperty({
    example: 'FIGHT',
    enum: LootSource,
    description: 'Source of the loot',
  })
  source: LootSource;

  @Expose()
  @ApiProperty({
    example: 'Boss Arena',
    description: 'Location where loot was obtained',
  })
  location: string;

  @Expose()
  @ApiProperty({
    description: 'Array of items',
    example: [
      {
        hid: 'item_hash',
        name: 'Legendary Sword',
        icon: 'sword_icon',
        pr: 5,
        prc: 'unique',
        stat: 'dmg: 100',
        id: 12345,
        cl: 1,
      },
    ],
  })
  items: unknown;

  @Expose()
  @ApiProperty({
    description: 'Array of players',
    example: [
      {
        id: 123,
        accountId: 456,
        name: 'PlayerName',
        lvl: 100,
        prof: 'warrior',
        icon: 'player_icon',
        hpp: 5000,
      },
    ],
  })
  players: unknown;

  @Expose()
  @ApiProperty({
    description: 'Array of NPCs',
    example: [
      {
        id: 789,
        name: 'Boss',
        location: 'Boss Arena',
        lvl: 150,
        type: 6,
        icon: 'boss_icon',
      },
    ],
  })
  npcs: unknown;

  @Expose()
  @ApiProperty({
    description: 'Loot share data',
    example: {},
    required: false,
  })
  lootShare?: unknown;

  @Expose()
  @ApiProperty({
    example: '2025-10-13T12:00:00Z',
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    example: '10',
    description: 'Number of comments on the loot',
  })
  commentsCount: string;

  @Exclude()
  uniqueId: string;

  @Exclude()
  updatedAt: Date;
}

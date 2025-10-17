import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserLootlogConfigEntity {
  @Expose()
  @ApiProperty({ example: 'user_id_123', description: 'User ID' })
  userId: string;

  @Expose()
  @ApiProperty({ example: 'account_123', description: 'Account ID' })
  accountId: string;

  @Expose()
  @ApiProperty({ example: 'character_456', description: 'Character ID' })
  characterId: string;

  @Expose()
  @ApiProperty({
    example: ['guild_1', 'guild_2'],
    description: 'Guild IDs to exclude from loot collection',
    type: [String],
  })
  collectLootBlaclistGuildIds: string[];

  @Expose()
  @ApiProperty({
    example: ['guild_3', 'guild_4'],
    description: 'Guild IDs to exclude from timer creation',
    type: [String],
  })
  addTimersBlacklistGuildIds: string[];

  @Exclude()
  id: number;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}

import { Expose, Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GuildTimerSettingsEntity {
  @Exclude()
  id: number;

  @Expose()
  @ApiProperty({ example: 'user_id_123', description: 'User ID' })
  userId: string;

  @Expose()
  @ApiProperty({ example: 'guild_id_456', description: 'Guild ID' })
  guildId: string;

  @Expose()
  @ApiProperty({
    description: 'Array of hidden timer IDs',
    example: ['timer-1', 'timer-2'],
    type: [String],
  })
  hiddenTimers: string[];

  @Expose()
  @ApiProperty({
    description: 'Array of pinned timer IDs',
    example: ['timer-3', 'timer-4'],
    type: [String],
  })
  pinnedTimers: string[];

  @Expose()
  @ApiProperty({
    description: 'Array of timer names with sound enabled',
    example: ['Tanroth', 'Fanatyk'],
    type: [String],
  })
  soundEnabledTimers: string[];

  @Expose()
  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TimerEntity {
  @Expose()
  @ApiProperty({ example: 'guild_id_123', description: 'Guild ID' })
  guildId: string;

  @Expose()
  @ApiProperty({ example: 12345, description: 'NPC ID' })
  npcId: number;

  @Expose()
  @ApiProperty({ example: 'Zorza', description: 'World name' })
  world: string;

  @Expose()
  @ApiProperty({
    example: '2025-10-13T12:00:00Z',
    description: 'Minimum spawn time',
  })
  minSpawnTime: Date;

  @Expose()
  @ApiProperty({
    example: '2025-10-13T14:00:00Z',
    description: 'Maximum spawn time',
  })
  maxSpawnTime: Date;

  @Expose()
  @ApiProperty({
    description: 'NPC data',
    example: {
      id: 12345,
      name: 'Boss Name',
      location: 'Boss Location',
      lvl: 100,
      type: 6,
      icon: 'npc_icon',
    },
  })
  npc: {
    id: number;
    name: string;
    location: string;
    lvl: number;
    type: number;
    icon: string;
  };

  @Expose()
  @ApiProperty({
    example: false,
    description: 'Indicates if the timer was manually reset',
  })
  wasReset: boolean;

  @Expose()
  member: unknown;

  @Exclude()
  createdById: number;

  @Exclude()
  latestRespBaseSeconds: number;

  @Exclude()
  latestRespawnRandomness: number;

  @Exclude()
  createdAt: Date;

  @Expose()
  @ApiProperty({
    example: '2025-09-01T10:00:00Z',
    description: 'Last updated timestamp',
  })
  updatedAt: Date;
}

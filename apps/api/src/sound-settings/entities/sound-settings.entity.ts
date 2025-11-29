import { Expose, Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SoundSettingsEntity {
  @Exclude()
  id: number;

  @Expose()
  @ApiProperty({ example: 'user_id_123', description: 'User ID' })
  userId: string;

  @Expose()
  @ApiProperty({
    description: 'Master volume (0.0 to 1.0)',
    example: 0.5,
  })
  masterVolume: number;

  @Expose()
  @ApiProperty({
    description: 'Notifications volume (0.0 to 1.0)',
    example: 0.5,
  })
  notificationsVolume: number;

  @Expose()
  @ApiProperty({
    description: 'Detector volume (0.0 to 1.0)',
    example: 0.5,
  })
  detectorVolume: number;

  @Expose()
  @ApiProperty({
    description: 'Timers volume (0.0 to 1.0)',
    example: 0.5,
  })
  timersVolume: number;

  @Expose()
  @ApiProperty({
    description: 'Sound configuration for notifications',
    example: {
      ELITE2: { volume: 0.3, soundUrl: '' },
      HERO: { volume: 0.5, soundUrl: '' },
      message: { volume: 0.5, soundUrl: '' },
    },
  })
  notificationsConfig: Record<string, unknown>;

  @Expose()
  @ApiProperty({
    description: 'Sound configuration for detector',
    example: {
      ELITE2: { volume: 0.3, soundUrl: '' },
      HERO: { volume: 0.5, soundUrl: '' },
      TITAN: { volume: 1.0, soundUrl: '' },
    },
  })
  detectorConfig: Record<string, unknown>;

  @Expose()
  @ApiProperty({
    description: 'Sound configuration for timers',
    example: {
      ELITE2: { volume: 0.3, soundUrl: '' },
      HERO: { volume: 0.5, soundUrl: '' },
      TITAN: { volume: 1.0, soundUrl: '' },
    },
  })
  timersConfig: Record<string, unknown>;

  @Expose()
  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

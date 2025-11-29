import {
  IsOptional,
  IsNumber,
  IsObject,
  IsUrl,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class NpcTypeSoundConfigDto {
  @ApiProperty({
    description: 'Volume for this NPC type (0.0 to 1.0)',
    example: 0.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  volume?: number;

  @ApiProperty({
    description: 'Custom sound URL for this NPC type',
    example: 'https://example.com/sound.mp3',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'soundUrl must be a valid URL' })
  soundUrl?: string;
}

export class UpdateSoundSettingsDto {
  @ApiProperty({
    description: 'Master volume (0.0 to 1.0)',
    example: 0.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  masterVolume?: number;

  @ApiProperty({
    description: 'Notifications volume (0.0 to 1.0)',
    example: 0.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  notificationsVolume?: number;

  @ApiProperty({
    description: 'Detector volume (0.0 to 1.0)',
    example: 0.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  detectorVolume?: number;

  @ApiProperty({
    description: 'Timers volume (0.0 to 1.0)',
    example: 0.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  timersVolume?: number;

  @ApiProperty({
    description: 'Sound configuration for notifications',
    example: {
      ELITE2: { volume: 0.3, soundUrl: '' },
      HERO: { volume: 0.5, soundUrl: '' },
      message: { volume: 0.5, soundUrl: '' },
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => NpcTypeSoundConfigDto)
  notificationsConfig?: Record<string, NpcTypeSoundConfigDto>;

  @ApiProperty({
    description: 'Sound configuration for detector',
    example: {
      ELITE2: { volume: 0.3, soundUrl: '' },
      HERO: { volume: 0.5, soundUrl: '' },
      TITAN: { volume: 1.0, soundUrl: '' },
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => NpcTypeSoundConfigDto)
  detectorConfig?: Record<string, NpcTypeSoundConfigDto>;

  @ApiProperty({
    description: 'Sound configuration for timers',
    example: {
      ELITE2: { volume: 0.3, soundUrl: '' },
      HERO: { volume: 0.5, soundUrl: '' },
      TITAN: { volume: 1.0, soundUrl: '' },
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => NpcTypeSoundConfigDto)
  timersConfig?: Record<string, NpcTypeSoundConfigDto>;
}

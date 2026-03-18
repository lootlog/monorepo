import {
  IsOptional,
  IsNumber,
  IsObject,
  Min,
  Max,
  ValidateNested,
  IsUrl,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

class NpcTypeSoundConfigDto {
  @ApiPropertyOptional({
    description: "Volume for this NPC type (0.0 to 1.0)",
    example: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  volume?: number;

  @ApiPropertyOptional({
    description:
      "Custom sound URL for this NPC type (empty string to use default)",
    example: "https://example.com/sound.mp3",
  })
  @IsOptional()
  @ValidateIf((o) => o.soundUrl !== "")
  @IsUrl({}, { message: "soundUrl must be a valid URL" })
  soundUrl?: string;
}

class SoundConfigMapDto {
  @ApiPropertyOptional({ type: () => NpcTypeSoundConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NpcTypeSoundConfigDto)
  ELITE2?: NpcTypeSoundConfigDto;

  @ApiPropertyOptional({ type: () => NpcTypeSoundConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NpcTypeSoundConfigDto)
  HERO?: NpcTypeSoundConfigDto;

  @ApiPropertyOptional({ type: () => NpcTypeSoundConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NpcTypeSoundConfigDto)
  TITAN?: NpcTypeSoundConfigDto;

  @ApiPropertyOptional({ type: () => NpcTypeSoundConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NpcTypeSoundConfigDto)
  COLOSSUS?: NpcTypeSoundConfigDto;

  @ApiPropertyOptional({ type: () => NpcTypeSoundConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NpcTypeSoundConfigDto)
  message?: NpcTypeSoundConfigDto;
}

export class UpdateSoundSettingsDto {
  @ApiPropertyOptional({
    description: "Master volume (0.0 to 1.0)",
    example: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  masterVolume?: number;

  @ApiPropertyOptional({
    description: "Notifications volume (0.0 to 1.0)",
    example: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  notificationsVolume?: number;

  @ApiPropertyOptional({
    description: "Detector volume (0.0 to 1.0)",
    example: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  detectorVolume?: number;

  @ApiPropertyOptional({
    description: "Timers volume (0.0 to 1.0)",
    example: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  timersVolume?: number;

  @ApiPropertyOptional({
    description: "Sound configuration for notifications",
    type: () => SoundConfigMapDto,
    example: {
      ELITE2: { volume: 0.3, soundUrl: "" },
      HERO: { volume: 0.5, soundUrl: "" },
      message: { volume: 0.5, soundUrl: "" },
    },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SoundConfigMapDto)
  notificationsConfig?: SoundConfigMapDto;

  @ApiPropertyOptional({
    description: "Sound configuration for detector",
    type: () => SoundConfigMapDto,
    example: {
      ELITE2: { volume: 0.5, soundUrl: "" },
      HERO: { volume: 0.5, soundUrl: "" },
      TITAN: { volume: 1.0, soundUrl: "" },
    },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SoundConfigMapDto)
  detectorConfig?: SoundConfigMapDto;

  @ApiPropertyOptional({
    description: "Sound configuration for timers",
    type: () => SoundConfigMapDto,
    example: {
      ELITE2: { volume: 0.3, soundUrl: "" },
      HERO: { volume: 0.5, soundUrl: "" },
      TITAN: { volume: 1.0, soundUrl: "" },
    },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SoundConfigMapDto)
  timersConfig?: SoundConfigMapDto;
}

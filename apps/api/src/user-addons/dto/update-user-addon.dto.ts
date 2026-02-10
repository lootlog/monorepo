import { AddonLanguage } from 'generated/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserAddonDto {
  @ApiPropertyOptional({
    description: 'Runtime addon identifier used in game-client',
    example: 'online-players-glow-plus',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  @Length(3, 64)
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'runtimeId must contain only lowercase letters, digits and hyphens',
  })
  runtimeId?: string;

  @ApiPropertyOptional({
    description: 'Display name shown in addon list (derived from source code)',
    example: 'Online Players Glow Plus',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  @Length(3, 80)
  name?: string;

  @ApiPropertyOptional({
    description: 'Optional addon description (derived from source code)',
    example: 'Highlights addon users on map and extends player tooltip.',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Addon semantic version (derived from source code)',
    example: '0.1.0',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  version?: string;

  @ApiPropertyOptional({
    enum: AddonLanguage,
    description: 'Source language selected in editor',
  })
  @IsOptional()
  @IsEnum(AddonLanguage)
  language?: AddonLanguage;

  @ApiPropertyOptional({
    description: 'Addon source code',
    minLength: 1,
    maxLength: 120000,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120000)
  sourceCode?: string;

  @ApiPropertyOptional({
    description: 'Installed state for runtime',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  installed?: boolean;
}

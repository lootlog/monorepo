import {
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserPreferencesDto {
  @ApiProperty({
    description: 'Ordered list of guild IDs for user preferences',
    example: ['guild1', 'guild2', 'guild3'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  guildsOrder?: string[];

  @ApiProperty({
    description: 'Theme preference',
    example: 'cyberpunk',
    required: false,
    enum: [
      'default',
      'cyberpunk',
      'pastel',
      'fantasy',
      'shonen',
      'onepiece',
      'anime',
      'goth',
      'halloween',
      'realmadrid',
      'realmadrid-3rd',
      'barcelona',
      'waguri',
      'rukia',
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'default',
    'cyberpunk',
    'pastel',
    'fantasy',
    'shonen',
    'onepiece',
    'anime',
    'goth',
    'halloween',
    'realmadrid',
    'realmadrid-3rd',
    'barcelona',
    'waguri',
    'rukia',
  ])
  theme?: string;

  @ApiProperty({
    description: 'Color mode preference',
    example: 'dark',
    required: false,
    enum: ['light', 'dark'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark'])
  colorMode?: string;
}

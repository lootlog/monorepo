import {
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserPreferencesDto {
  @ApiProperty({
    description: 'Ordered list of guild IDs for user preferences',
    example: ['guild1', 'guild2', 'guild3'],
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  guildsOrder?: string[];
}

import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLocationDto {
  @ApiProperty({ description: 'Location name', example: 'Północne Lasy' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}

import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMapDto {
  @ApiProperty({ description: 'Map name' })
  @IsString()
  mapName: string;
}

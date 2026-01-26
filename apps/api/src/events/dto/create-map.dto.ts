import { IsString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMapDto {
  @ApiProperty({ description: 'Margonem map ID' })
  @IsInt()
  mapId: number;

  @ApiProperty({ description: 'Map name' })
  @IsString()
  mapName: string;
}

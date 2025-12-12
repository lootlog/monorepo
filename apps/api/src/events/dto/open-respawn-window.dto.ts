import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class OpenRespawnWindowDto {
  @ApiProperty({
    description: 'Minimum spawn time (ISO date string)',
  })
  @IsNotEmpty()
  @IsDateString()
  minSpawnTime: string;

  @ApiProperty({
    description: 'Maximum spawn time (ISO date string)',
  })
  @IsNotEmpty()
  @IsDateString()
  maxSpawnTime: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class OpenRespawnWindowDto {
  @ApiPropertyOptional({
    description:
      'Custom minimum spawn time (ISO date string). If not provided, uses default calculated times based on previous timer data.',
  })
  @IsOptional()
  @IsDateString()
  minSpawnTime?: string;

  @ApiPropertyOptional({
    description:
      'Custom maximum spawn time (ISO date string). If not provided, uses default calculated times based on previous timer data.',
  })
  @IsOptional()
  @IsDateString()
  maxSpawnTime?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, ValidateIf } from 'class-validator';

export class CloseRespawnWindowDto {
  @ApiPropertyOptional({
    description: 'Whether to create a new respawn window after closing',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  createNewWindow?: boolean;

  @ApiPropertyOptional({
    description:
      'Custom minimum spawn time for the new window (ISO date string). If not provided, uses default calculated times.',
  })
  @IsOptional()
  @ValidateIf((o) => o.createNewWindow)
  @IsDateString()
  newMinSpawnTime?: string;

  @ApiPropertyOptional({
    description:
      'Custom maximum spawn time for the new window (ISO date string). If not provided, uses default calculated times.',
  })
  @IsOptional()
  @ValidateIf((o) => o.createNewWindow)
  @IsDateString()
  newMaxSpawnTime?: string;
}

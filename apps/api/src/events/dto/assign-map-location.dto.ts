import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignMapLocationDto {
  @ApiPropertyOptional({
    description: 'Location ID (null to remove from location)',
    example: 'clxxx123',
  })
  @IsOptional()
  @IsString()
  locationId?: string | null;
}

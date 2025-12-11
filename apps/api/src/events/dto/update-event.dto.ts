import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsDateString,
  IsInt,
  Min,
  IsNumber,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { HeroNpcDto } from './create-event.dto';

export class TimeOfDayMultiplierDto {
  @IsString()
  from: string; // HH:mm format

  @IsString()
  to: string; // HH:mm format

  @IsNumber()
  @Min(0)
  multiplier: number;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ description: 'Event name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Event active status' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Event start time' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Event end time' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({
    description: 'Hero NPCs to track with their spawn maps',
    type: [HeroNpcDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HeroNpcDto)
  heroNpcs?: HeroNpcDto[];

  @ApiPropertyOptional({
    description: 'Base points awarded per hero kill before multipliers',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  basePointsPerKill?: number;

  @ApiPropertyOptional({
    description:
      'Time of day multipliers array: [{from: "06:00", to: "12:00", multiplier: 1.5}, ...]',
    type: [TimeOfDayMultiplierDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeOfDayMultiplierDto)
  timeOfDayMultipliers?: TimeOfDayMultiplierDto[];

  @ApiPropertyOptional({
    description:
      'Trackers count multipliers: {1: 3.0, 2: 2.5, ...} - fewer trackers = higher multiplier',
  })
  @IsOptional()
  @IsObject()
  trackersMultipliers?: Record<string, number>;

  @ApiPropertyOptional({
    description:
      'Maps count multipliers: {1: 1.0, 2: 1.2, ...} - more maps = higher multiplier',
  })
  @IsOptional()
  @IsObject()
  mapsCountMultipliers?: Record<string, number>;

  @ApiPropertyOptional({
    description: 'Minutes before minSpawnTime when assignments are allowed',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  assignmentTimeoutMinutes?: number;

  @ApiPropertyOptional({
    description: 'Whether to automatically calculate points on kill',
  })
  @IsOptional()
  @IsBoolean()
  autoCalculatePoints?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of members that can assign to a single map (null or 0 = no limit)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  mapAssignmentCap?: number;
}

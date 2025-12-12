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
  Matches,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { HeroNpcDto } from './create-event.dto';

function IsMultiplierRecord(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isMultiplierRecord',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (value === null || value === undefined) return true;
          if (typeof value !== 'object' || Array.isArray(value)) return false;

          const record = value as Record<string, unknown>;
          return Object.entries(record).every(([key, val]) => {
            const numKey = parseInt(key, 10);
            return (
              !isNaN(numKey) &&
              numKey >= 0 &&
              typeof val === 'number' &&
              val >= 0
            );
          });
        },
        defaultMessage(_args: ValidationArguments) {
          return 'Must be an object with numeric keys (>=0) and numeric values (>=0)';
        },
      },
    });
  };
}

export class TimeOfDayMultiplierDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'from must be in HH:mm format (00:00-23:59)',
  })
  from: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'to must be in HH:mm format (00:00-23:59)',
  })
  to: string;

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
  @IsMultiplierRecord({
    message:
      'trackersMultipliers must be an object with numeric keys (>=0) and numeric values (>=0)',
  })
  trackersMultipliers?: Record<string, number>;

  @ApiPropertyOptional({
    description:
      'Maps count multipliers: {1: 1.0, 2: 1.2, ...} - more maps = higher multiplier',
  })
  @IsOptional()
  @IsMultiplierRecord({
    message:
      'mapsCountMultipliers must be an object with numeric keys (>=0) and numeric values (>=0)',
  })
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

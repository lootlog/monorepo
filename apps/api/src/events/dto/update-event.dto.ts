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
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { HeroNpcDto } from './create-event.dto';
import { EventScoringRulesDto } from './event-scoring-rules.dto';

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
  @IsNumber()
  @Min(0)
  basePointsPerKill?: number;

  @ApiPropertyOptional({
    description:
      'DEPRECATED: legacy multipliers are no longer used for scoring. Field is accepted for backward compatibility and ignored.',
    type: [TimeOfDayMultiplierDto],
    deprecated: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeOfDayMultiplierDto)
  timeOfDayMultipliers?: TimeOfDayMultiplierDto[];

  @ApiPropertyOptional({
    description:
      'DEPRECATED: legacy multipliers are no longer used for scoring. Field is accepted for backward compatibility and ignored.',
    deprecated: true,
  })
  @IsOptional()
  @IsMultiplierRecord({
    message:
      'trackersMultipliers must be an object with numeric keys (>=0) and numeric values (>=0)',
  })
  trackersMultipliers?: Record<string, number>;

  @ApiPropertyOptional({
    description:
      'DEPRECATED: legacy multipliers are no longer used for scoring. Field is accepted for backward compatibility and ignored.',
    deprecated: true,
  })
  @IsOptional()
  @IsMultiplierRecord({
    message:
      'mapsCountMultipliers must be an object with numeric keys (>=0) and numeric values (>=0)',
  })
  mapsCountMultipliers?: Record<string, number>;

  @ApiPropertyOptional({
    description:
      'DEPRECATED: legacy multipliers are no longer used for scoring. Field is accepted for backward compatibility and ignored.',
    deprecated: true,
  })
  @IsOptional()
  @IsMultiplierRecord({
    message:
      'trackingDurationMultipliers must be an object with numeric keys (0-100) and numeric values (>=0)',
  })
  trackingDurationMultipliers?: Record<string, number>;

  @ApiPropertyOptional({
    description: 'Minutes before minSpawnTime when assignments are allowed',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  assignmentTimeoutMinutes?: number;

  @ApiPropertyOptional({
    description:
      'Minutes from kill time to confirm participation (0 disables confirmations)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  participationConfirmationMinutes?: number;

  @ApiPropertyOptional({
    description:
      'Maximum number of members that can assign to a single map (null or 0 = no limit)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  mapAssignmentCap?: number;

  @ApiPropertyOptional({
    description: 'Optional event rulebook displayed to participants',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  rulebookMarkdown?: string;

  @ApiPropertyOptional({
    description: 'Scoring rules configuration for this event',
    type: EventScoringRulesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EventScoringRulesDto)
  scoringRules?: EventScoringRulesDto;
}

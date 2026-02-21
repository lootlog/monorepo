import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventScoringThresholdDto {
  @ApiProperty({
    description: 'Tracking duration threshold percentage (0-100)',
    example: 75,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiProperty({
    description: 'Base points awarded when threshold is reached',
    example: 1,
  })
  @IsNumber()
  @Min(0)
  points: number;
}

export class EventScoringGroupBonusDto {
  @ApiProperty({
    description: 'Minimum assigned members count for group bonus',
    example: 1,
  })
  @IsInt()
  @Min(0)
  minAssignedMembers: number;

  @ApiProperty({
    description: 'Maximum assigned members count for group bonus',
    example: 4,
  })
  @IsInt()
  @Min(0)
  maxAssignedMembers: number;

  @ApiProperty({
    description: 'Points added when group bonus condition is met',
    example: 0.5,
  })
  @IsNumber()
  @Min(0)
  points: number;
}

export class EventScoringNightBonusDto {
  @ApiProperty({
    description: 'Night window start in HH:mm format',
    example: '03:00',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  windowStart: string;

  @ApiProperty({
    description: 'Night window end in HH:mm format',
    example: '08:00',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  windowEnd: string;

  @ApiProperty({
    description: 'Required overlap percentage (0-100)',
    example: 75,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  requiredCoveragePercentage: number;

  @ApiProperty({
    description: 'Points added when night bonus condition is met',
    example: 0.5,
  })
  @IsNumber()
  @Min(0)
  points: number;
}

export class EventScoringPvpBonusDto {
  @ApiProperty({
    description: 'PvP window start in HH:mm format',
    example: '08:00',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  windowStart: string;

  @ApiProperty({
    description: 'PvP window end in HH:mm format',
    example: '11:00',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  windowEnd: string;

  @ApiProperty({
    description: 'Points added when PvP bonus condition is met',
    example: 0.5,
  })
  @IsNumber()
  @Min(0)
  points: number;
}

export class EventScoringRulesDto {
  @ApiProperty({
    description:
      'Base points thresholds. Highest matching threshold is applied.',
    type: [EventScoringThresholdDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => EventScoringThresholdDto)
  baseThresholds: EventScoringThresholdDto[];

  @ApiProperty({
    description:
      'Grace period in minutes for players who left map before kill (applies to highest threshold tier)',
    example: 10,
  })
  @IsInt()
  @Min(0)
  leaveGraceMinutes: number;

  @ApiProperty({
    description: 'Small-group bonus configuration',
    type: EventScoringGroupBonusDto,
  })
  @ValidateNested()
  @Type(() => EventScoringGroupBonusDto)
  groupBonus: EventScoringGroupBonusDto;

  @ApiProperty({
    description: 'Night bonus configuration',
    type: EventScoringNightBonusDto,
  })
  @ValidateNested()
  @Type(() => EventScoringNightBonusDto)
  nightBonus: EventScoringNightBonusDto;

  @ApiProperty({
    description: 'PvP bonus configuration',
    type: EventScoringPvpBonusDto,
  })
  @ValidateNested()
  @Type(() => EventScoringPvpBonusDto)
  pvpBonus: EventScoringPvpBonusDto;

  @ApiProperty({
    description: 'Maximum total points cap for a single hero kill',
    example: 2,
  })
  @IsNumber()
  @Min(0)
  hardCapPoints: number;

  @ApiPropertyOptional({
    description: 'Timezone used for local-time bonus windows',
    example: 'Europe/Warsaw',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}

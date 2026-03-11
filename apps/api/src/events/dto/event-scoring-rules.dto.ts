import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  EVENT_SCORING_ACTION_TYPES,
  EVENT_SCORING_BOOLEAN_FACTORS,
  EVENT_SCORING_CONDITION_TYPES,
  EVENT_SCORING_NUMERIC_FACTORS,
  EVENT_SCORING_NUMERIC_OPERATORS,
} from "../constants/scoring-rules.constant";

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class EventScoringConditionDto {
  @ApiProperty({
    enum: EVENT_SCORING_CONDITION_TYPES,
  })
  @IsString()
  @IsIn(EVENT_SCORING_CONDITION_TYPES)
  type: string;

  @ApiPropertyOptional({
    enum: EVENT_SCORING_NUMERIC_FACTORS,
  })
  @IsOptional()
  @IsString()
  @IsIn(EVENT_SCORING_NUMERIC_FACTORS)
  factor?: string;

  @ApiPropertyOptional({
    enum: EVENT_SCORING_NUMERIC_OPERATORS,
  })
  @IsOptional()
  @IsString()
  @IsIn(EVENT_SCORING_NUMERIC_OPERATORS)
  operator?: string;

  @ApiPropertyOptional({ description: "Numeric value for compare conditions" })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({
    description: "Window start in HH:mm",
    example: "03:00",
  })
  @IsOptional()
  @IsString()
  @Matches(CLOCK_PATTERN)
  from?: string;

  @ApiPropertyOptional({
    description: "Window end in HH:mm",
    example: "08:00",
  })
  @IsOptional()
  @IsString()
  @Matches(CLOCK_PATTERN)
  to?: string;
}

export class EventScoringActionDto {
  @ApiProperty({
    enum: EVENT_SCORING_ACTION_TYPES,
  })
  @IsString()
  @IsIn(EVENT_SCORING_ACTION_TYPES)
  type: string;

  @ApiPropertyOptional({
    description: "Action points for SET_BASE / ADD_BONUS",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  points?: number;
}

export class EventScoringRuleDto {
  @ApiProperty({
    description: "Rule identifier",
  })
  @IsString()
  id: string;

  @ApiPropertyOptional({
    description: "Optional display name",
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: "Rule toggle",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    type: [EventScoringConditionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventScoringConditionDto)
  conditions: EventScoringConditionDto[];

  @ApiProperty({
    type: EventScoringActionDto,
  })
  @ValidateNested()
  @Type(() => EventScoringActionDto)
  action: EventScoringActionDto;
}

export class EventScoringRulesDto {
  @ApiProperty({
    description: "Ruleset version",
    default: 1,
  })
  @IsNumber()
  @Min(1)
  @Max(1)
  version: number;

  @ApiProperty({
    description: "Timezone used for local-time windows",
    example: "Europe/Warsaw",
  })
  @IsString()
  timezone: string;

  @ApiProperty({
    description: "Maximum total points per kill",
    example: 2,
  })
  @IsNumber()
  @Min(0)
  hardCapPoints: number;

  @ApiPropertyOptional({
    description:
      "Minimum tracking percentage required to receive ADD_BONUS actions",
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minTrackingPercentForBonuses?: number;

  @ApiProperty({
    type: [EventScoringRuleDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventScoringRuleDto)
  rules: EventScoringRuleDto[];
}

export class EventScoringBooleanConditionDto extends EventScoringConditionDto {
  @ApiProperty({
    enum: EVENT_SCORING_BOOLEAN_FACTORS,
  })
  @IsString()
  @IsIn(EVENT_SCORING_BOOLEAN_FACTORS)
  factor: string;
}

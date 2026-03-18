import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
  IsInt,
  Min,
  IsNumber,
  MaxLength,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { HeroNpcDto } from "./create-event.dto";
import { EventScoringRulesDto } from "./event-scoring-rules.dto";
import { EVENT_SCORING_MODES } from "../constants/scoring-rules.constant";

export class UpdateEventDto {
  @ApiPropertyOptional({ description: "Event name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "Event start time" })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: "Event end time" })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({
    description: "Hero NPCs to track with their spawn maps",
    type: [HeroNpcDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HeroNpcDto)
  heroNpcs?: HeroNpcDto[];

  @ApiPropertyOptional({
    description: "Legacy base points value kept for compatibility",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePointsPerKill?: number;

  @ApiPropertyOptional({
    description: "Minutes before minSpawnTime when assignments are allowed",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  assignmentTimeoutMinutes?: number;

  @ApiPropertyOptional({
    description:
      "Minutes from kill time to confirm participation (0 disables confirmations)",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  participationConfirmationMinutes?: number;

  @ApiPropertyOptional({
    description:
      "Maximum number of members that can assign to a single map (null or 0 = no limit)",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  mapAssignmentCap?: number;

  @ApiPropertyOptional({
    description: "Optional event rulebook displayed to participants",
  })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  rulebookMarkdown?: string;

  @ApiPropertyOptional({
    description: "Scoring rules configuration for this event",
    type: EventScoringRulesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EventScoringRulesDto)
  scoringRules?: EventScoringRulesDto;

  @ApiPropertyOptional({
    description: "Scoring mode used for this event",
    enum: EVENT_SCORING_MODES,
  })
  @IsOptional()
  @IsString()
  @IsIn(EVENT_SCORING_MODES)
  scoringMode?: "SIMPLE" | "ADVANCED";
}

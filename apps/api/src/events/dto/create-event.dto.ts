import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsInt,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventScoringRulesDto } from './event-scoring-rules.dto';
import { EVENT_SCORING_MODES } from '../constants/scoring-rules.constant';

export class HeroMapDto {
  @ApiProperty({ description: 'Margonem map ID' })
  @IsInt()
  mapId: number;

  @ApiProperty({ description: 'Map name' })
  @IsString()
  mapName: string;
}

export class HeroNpcDto {
  @ApiPropertyOptional({ description: 'NPC ID' })
  @IsOptional()
  @IsInt()
  npcId?: number;

  @ApiProperty({ description: 'NPC name' })
  @IsString()
  npcName: string;

  @ApiProperty({
    description: 'Maps where the NPC can spawn',
    type: [HeroMapDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HeroMapDto)
  maps: HeroMapDto[];
}

export class CreateEventDto {
  @ApiProperty({ description: 'Event name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'World name' })
  @IsString()
  world: string;

  @ApiPropertyOptional({
    description: 'Whether the event is active',
    default: true,
  })
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
    description: 'Legacy base points value kept for compatibility',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePointsPerKill?: number;

  @ApiPropertyOptional({
    description: 'Minutes before minSpawnTime when assignments are allowed',
    default: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  assignmentTimeoutMinutes?: number;

  @ApiPropertyOptional({
    description:
      'Minutes from kill time to confirm participation (0 disables confirmations)',
    default: 0,
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

  @ApiPropertyOptional({
    description: 'Scoring mode used for this event',
    enum: EVENT_SCORING_MODES,
    default: 'SIMPLE',
  })
  @IsOptional()
  @IsString()
  @IsIn(EVENT_SCORING_MODES)
  scoringMode?: 'SIMPLE' | 'ADVANCED';

  @ApiPropertyOptional({
    description: 'Hero NPCs to track in this event',
    type: [HeroNpcDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HeroNpcDto)
  heroNpcs?: HeroNpcDto[];
}

import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ActivitySource, ActivityType } from '../../../prisma/generated/client';

export class ActorSnapshotDto {
  @IsOptional()
  accountId?: number;

  @IsOptional()
  characterId?: number;

  @IsString()
  @IsOptional()
  clanName?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsOptional()
  lvl?: number;

  @IsString()
  @IsOptional()
  prof?: string;
}

export class LootContextDto {
  @IsNotEmpty()
  lootId: number;
}

export class TimerContextDto {
  @IsString()
  @IsNotEmpty()
  npcName: string;
}

export class CreateActivityDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  guildId: string;

  @IsString()
  @IsNotEmpty()
  discordId: string;

  @IsEnum(ActivityType)
  @IsNotEmpty()
  type: ActivityType;

  @IsEnum(ActivitySource)
  @IsNotEmpty()
  source: ActivitySource;

  @IsObject()
  @IsOptional()
  details?: Record<string, unknown>;

  @ValidateNested()
  @Type(() => ActorSnapshotDto)
  @IsOptional()
  actorSnapshot?: ActorSnapshotDto;

  @ValidateNested()
  @Type(() => LootContextDto)
  @IsOptional()
  lootContext?: LootContextDto;

  @ValidateNested()
  @Type(() => TimerContextDto)
  @IsOptional()
  timerContext?: TimerContextDto;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

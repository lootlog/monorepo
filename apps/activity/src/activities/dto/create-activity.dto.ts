import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  ValidationArguments,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ActivitySource,
  ActivityType,
  Profession,
} from '../../../prisma/generated/client';

@ValidatorConstraint({ name: 'actorSnapshotForGameSource', async: false })
class ActorSnapshotForGameSourceConstraint
  implements ValidatorConstraintInterface
{
  validate(
    actorSnapshot: ActorSnapshotDto | undefined,
    args: ValidationArguments,
  ) {
    const dto = args.object as CreateActivityDto;

    if (dto.source !== ActivitySource.GAME) {
      return true;
    }

    if (!actorSnapshot) {
      return false;
    }

    const requiredFields = [
      'accountId',
      'characterId',
      'clanName',
      'clanId',
      'icon',
      'lvl',
      'prof',
    ];

    for (const field of requiredFields) {
      const value = actorSnapshot[field as keyof ActorSnapshotDto];
      if (value === null || value === undefined) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const dto = args.object as CreateActivityDto;
    const actorSnapshot = dto.actorSnapshot;

    if (!actorSnapshot) {
      return 'actorSnapshot is required when source is GAME';
    }

    const missingFields = [
      'accountId',
      'characterId',
      'clanName',
      'clanId',
      'icon',
      'lvl',
      'prof',
    ].filter((field) => {
      const value = actorSnapshot[field as keyof ActorSnapshotDto];
      return value === null || value === undefined;
    });

    return `actorSnapshot is missing required fields for GAME source: ${missingFields.join(', ')}`;
  }
}

export class ActorSnapshotDto {
  @IsOptional()
  accountId?: number;

  @IsOptional()
  characterId?: number;

  @IsString()
  @IsOptional()
  clanName?: string;

  @IsNumber()
  @IsOptional()
  clanId?: number;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsOptional()
  lvl?: number;

  @IsString()
  @IsOptional()
  prof?: Profession;
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

  @IsString()
  @IsOptional()
  world?: string;

  @IsObject()
  @IsOptional()
  details?: Record<string, unknown>;

  @ValidateNested()
  @Type(() => ActorSnapshotDto)
  @Validate(ActorSnapshotForGameSourceConstraint)
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

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
} from "class-validator";
import { Type } from "class-transformer";
import { ActivitySource, ActivityType } from "../../../prisma/generated/client";

const GAME_SOURCE_REQUIRED_FIELDS: Array<keyof ActorSnapshotDto> = [
  "accountId",
  "characterId",
  "clanName",
  "clanId",
  "icon",
  "lvl",
  "prof",
];

@ValidatorConstraint({ name: "actorSnapshotForGameSource", async: false })
class ActorSnapshotForGameSourceConstraint implements ValidatorConstraintInterface {
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

    return GAME_SOURCE_REQUIRED_FIELDS.every((field) => {
      const value = actorSnapshot[field];
      return value !== null && value !== undefined;
    });
  }

  defaultMessage(args: ValidationArguments) {
    const dto = args.object as CreateActivityDto;
    const actorSnapshot = dto.actorSnapshot;

    if (!actorSnapshot) {
      return "actorSnapshot is required when source is GAME";
    }

    const missingFields = GAME_SOURCE_REQUIRED_FIELDS.filter((field) => {
      const value = actorSnapshot[field];
      return value === null || value === undefined;
    });

    return `actorSnapshot is missing required fields for GAME source: ${missingFields.join(", ")}`;
  }
}

export class ActorSnapshotDto {
  @IsNumber()
  @IsOptional()
  accountId?: number;

  @IsNumber()
  @IsOptional()
  characterId?: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  clanName?: string;

  @IsNumber()
  @IsOptional()
  clanId?: number;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsNumber()
  @IsOptional()
  lvl?: number;

  @IsString()
  @IsOptional()
  prof?: string;
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

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}

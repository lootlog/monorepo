import {
  NotificationScheduleAnchor,
  NotificationScheduleIntervalType,
  NotificationScheduleStrategy,
  NotificationTriggerType,
} from "@lootlog/types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { Error } from "src/notifications/enum/error.enum";
import { HasAtLeastOneNpc } from "./has-at-least-one-npc.validator";

@HasAtLeastOneNpc()
export class CreateNotificationRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  contentTemplate?: string | null;

  @ApiProperty({ enum: NotificationTriggerType })
  @IsEnum(NotificationTriggerType)
  triggerType: NotificationTriggerType;

  @ApiPropertyOptional()
  @ValidateIf(
    (obj) => obj.triggerType !== NotificationTriggerType.SCHEDULED_MESSAGE,
  )
  @IsString()
  @IsNotEmpty({ message: Error.NOTIFICATION_RULE_WORLD_REQUIRED })
  @MaxLength(50)
  world?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  npcId?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsInt({ each: true })
  npcIds?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  itemId?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  itemIds?: number[];

  @ApiPropertyOptional({ enum: NotificationScheduleStrategy })
  @IsOptional()
  @IsEnum(NotificationScheduleStrategy)
  scheduleStrategy?: NotificationScheduleStrategy;

  @ApiPropertyOptional({ enum: NotificationScheduleAnchor })
  @IsOptional()
  @IsEnum(NotificationScheduleAnchor)
  scheduleAnchor?: NotificationScheduleAnchor;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  scheduleOffsetMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ enum: NotificationScheduleIntervalType })
  @IsOptional()
  @IsEnum(NotificationScheduleIntervalType)
  scheduleIntervalType?: NotificationScheduleIntervalType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  scheduleIntervalValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  scheduleWeekday?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: Error.TIME_MUST_BE_HH_MM_FORMAT })
  scheduleTimeOfDay?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  scheduleTimezone?: string;

  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayMaxSize(3)
  @IsInt({ each: true })
  targetIds: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

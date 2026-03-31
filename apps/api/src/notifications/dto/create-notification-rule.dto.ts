import { NotificationTriggerType } from "@lootlog/types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateNotificationRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiProperty({ enum: NotificationTriggerType })
  @IsEnum(NotificationTriggerType)
  triggerType: NotificationTriggerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  world?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  npcId?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  npcIds?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  itemId?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  itemIds?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeMinutes?: number;

  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  targetIds: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  dedupeWindowSeconds?: number;
}

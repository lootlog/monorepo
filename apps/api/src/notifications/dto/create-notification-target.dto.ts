import { NotificationTargetType } from "@lootlog/types";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateNotificationTargetDto {
  @ApiPropertyOptional({ enum: NotificationTargetType })
  @IsEnum(NotificationTargetType)
  targetType: NotificationTargetType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;
}

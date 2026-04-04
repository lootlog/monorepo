import { NotificationTargetType } from "@lootlog/types";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { swaggerStringEnum } from "src/shared/swagger/prisma-enum";

export class CreateNotificationTargetDto {
  @ApiPropertyOptional(
    swaggerStringEnum("NotificationTargetType", NotificationTargetType),
  )
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

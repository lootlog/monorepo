import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateTargetDto {
  @IsEnum(["guild", "user"])
  ownerType: "guild" | "user";

  @IsString()
  ownerId: string;

  @IsEnum(["discord"])
  provider: "discord";

  @IsEnum(["channel", "dm"])
  targetType: "channel" | "dm";

  @IsString()
  externalId: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  guildName?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

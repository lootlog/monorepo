import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class SetGuildDiscordNotificationConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  channelId?: string;

  @IsBoolean()
  enabled: boolean;
}

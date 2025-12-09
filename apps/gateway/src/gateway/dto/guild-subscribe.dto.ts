import { IsString } from 'class-validator';

export class GuildSubscribeDto {
  @IsString()
  guildId: string;
}

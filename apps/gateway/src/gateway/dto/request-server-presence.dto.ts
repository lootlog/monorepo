import { IsNotEmpty, IsString } from 'class-validator';

export class RequestServerPresenceDto {
  @IsNotEmpty()
  @IsString()
  guildId: string;
}

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestPlayerPresenceDto {
  @IsNotEmpty()
  @IsString()
  guildId: string;

  @IsOptional()
  @IsString()
  world?: string;
}

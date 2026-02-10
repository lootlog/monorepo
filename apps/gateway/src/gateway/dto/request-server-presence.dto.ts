import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestServerPresenceDto {
  @IsOptional()
  @IsString()
  guildId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  guildIds?: string[];

  @IsNotEmpty()
  @IsString()
  world: string;
}

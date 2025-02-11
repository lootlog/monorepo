import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateGuildConfigDto {
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  vanityUrl?: string;
}

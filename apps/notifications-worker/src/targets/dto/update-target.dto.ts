import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateTargetDto {
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

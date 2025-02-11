import { IsOptional, IsString } from 'class-validator';

export class FetchGuildPlayersDto {
  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

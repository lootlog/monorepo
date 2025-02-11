import { IsOptional, IsString } from 'class-validator';

export class FetchGuildNpcsDto {
  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

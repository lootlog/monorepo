import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class SearchTimersNpcsDto {
  @IsString()
  @IsNotEmpty()
  search: string;

  @IsString()
  @IsNotEmpty()
  world: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

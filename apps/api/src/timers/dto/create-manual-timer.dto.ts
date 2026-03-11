import { Type } from "class-transformer";
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateManualTimerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxSeconds?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  customMinSpawnTime?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  customMaxSpawnTime?: Date;

  @IsNotEmpty()
  @IsString()
  world: string;
}

import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateManualTimerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  name: string;

  @IsNumber()
  @Min(2)
  respBaseSeconds: number;

  @IsOptional()
  @IsNumber()
  respawnRandomness?: number;

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

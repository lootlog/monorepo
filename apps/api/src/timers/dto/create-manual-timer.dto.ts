import {
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
  respawnRandomness: number;

  @IsNotEmpty()
  @IsString()
  world: string;
}

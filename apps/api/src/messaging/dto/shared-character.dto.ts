import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ClanDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}

export class CharacterDto {
  @IsNotEmpty()
  @IsNumber()
  lvl: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nick: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  accountId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  characterId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  prof: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2048)
  icon: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClanDto)
  clan?: ClanDto;
}

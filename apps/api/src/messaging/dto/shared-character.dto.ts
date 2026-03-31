import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ClanDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  name?: string;
}

export class CharacterDto {
  @IsNotEmpty()
  @IsNumber()
  lvl: number;

  @IsNotEmpty()
  @IsString()
  nick: string;

  @IsNotEmpty()
  @IsString()
  accountId: string;

  @IsNotEmpty()
  @IsString()
  characterId: string;

  @IsNotEmpty()
  @IsString()
  prof: string;

  @IsNotEmpty()
  @IsString()
  icon: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClanDto)
  clan?: ClanDto;
}

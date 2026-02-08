import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ClanDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  name?: string;
}

class CharacterDto {
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

export class CreatePartyGatheringDto {
  @IsArray()
  @IsNotEmpty()
  guildIds: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  world: string;

  @ValidateNested()
  @Type(() => CharacterDto)
  character: CharacterDto;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(500)
  minLvl?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(500)
  maxLvl?: number;
}

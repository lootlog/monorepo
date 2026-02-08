import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
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

export class CreateVolunteerDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  world: string;

  @IsNotEmpty()
  @IsString()
  targetDiscordId: string;

  @ValidateNested()
  @Type(() => CharacterDto)
  character: CharacterDto;
}

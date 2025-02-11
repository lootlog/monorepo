import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateUserLootlogConfigDto {
  @IsNotEmpty()
  @IsString()
  guildId: string;

  @IsNotEmpty()
  @IsString()
  world: string;

  @IsNotEmpty()
  @IsNumber()
  accountId: number;

  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateUserLootlogConfigPlayerDto)
  players: CreateUserLootlogConfigPlayerDto[];
}

export class CreateUserLootlogConfigPlayerDto {
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  prof: string;

  @IsNotEmpty()
  icon: string;

  @IsNotEmpty()
  @IsNumber()
  lvl: number;

  @IsNotEmpty()
  @IsBoolean()
  canAddLoot: boolean;

  @IsNotEmpty()
  @IsBoolean()
  canAddTimer: boolean;
}

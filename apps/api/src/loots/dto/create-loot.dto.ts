import { LootSource } from 'generated/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class LootDto {
  @IsNotEmpty()
  @IsString()
  hid: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  icon: string;

  @IsNotEmpty()
  @IsNumber()
  pr: number;

  @IsNotEmpty()
  @IsString()
  prc: string;

  @IsNotEmpty()
  @IsString()
  stat: string;

  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsNotEmpty()
  @IsNumber()
  cl: number;
}

class PlayerDto {
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsNotEmpty()
  @IsNumber()
  accountId: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  lvl: number;

  @IsNotEmpty()
  @IsString()
  prof: string;

  @IsNotEmpty()
  @IsString()
  icon: string;

  @IsNotEmpty()
  @IsNumber()
  hpp: number;
}

export class NpcDto {
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  location: string;

  @IsNotEmpty()
  @IsNumber()
  lvl: number;

  @ValidateIf((o) => {
    // npc type
    return !(o.type === 5 || o.type === 0);
  })
  @IsNotEmpty()
  @IsString()
  prof: string;

  @IsNotEmpty()
  @IsNumber()
  wt: number;

  @ValidateIf((o) => {
    // npc type
    return !(o.type === 5 || o.type === 0);
  })
  @IsNotEmpty()
  @IsNumber()
  hpp: number;

  @IsNotEmpty()
  @IsString()
  icon: string;

  @IsNotEmpty()
  @IsNumber()
  type: number;
}
export class CreateLootDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => LootDto)
  loots: LootDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => NpcDto)
  npcs: NpcDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => PlayerDto)
  players: PlayerDto[];

  @IsNotEmpty()
  @IsString()
  world: string;

  @IsNotEmpty()
  @IsEnum(LootSource)
  source: LootSource;

  @IsNotEmpty()
  @IsString()
  location: string;

  @IsNotEmpty()
  @IsString()
  accountId: string;

  @IsNotEmpty()
  @IsString()
  characterId: string;
}

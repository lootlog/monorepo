import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ValidateWarriorsRecord } from 'src/battles/validators/battle-warriors.validator';

export class CreateBattlePartyMembersEventDto {
  @IsNumber()
  id: number;

  @IsNumber()
  account: number;

  @IsString()
  nick: string;

  @IsString()
  icon: string;

  @IsOptional()
  @IsNumber()
  commander?: number;
}

export class CreateBattlePartyEventDto {
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => CreateBattlePartyMembersEventDto)
  members: Record<string, CreateBattlePartyMembersEventDto>;
}

export class CreateBattleFightEventWarriorDto {
  @IsNumber()
  originalId: number;

  @IsString()
  name: string;

  @IsNumber()
  lvl: number;

  @IsString()
  prof: string;

  @IsString()
  icon: string;

  @IsNumber()
  team: number;
}

export class CreateBattleFightEventDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  m?: string[];

  @IsOptional()
  @IsNumber()
  endBattle?: number;

  @IsOptional()
  @IsString()
  init?: string;

  @IsOptional()
  @IsString()
  auto?: string;

  @IsOptional()
  @ValidateWarriorsRecord()
  w?: Record<string, CreateBattleFightEventWarriorDto>;
}

export class CreateBattleEventsDto {
  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => CreateBattlePartyEventDto)
  party?: CreateBattlePartyEventDto;

  @IsObject()
  @ValidateNested()
  @Type(() => CreateBattleFightEventDto)
  f: CreateBattleFightEventDto;

  @IsNumber()
  ev: number;
}

export class CreateBattleDto {
  @IsString()
  accountId: string;

  @IsString()
  characterId: string;

  @IsString()
  world: string;

  @IsOptional()
  @IsBoolean()
  matchmaking?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBattleEventsDto)
  events: CreateBattleEventsDto[];
}

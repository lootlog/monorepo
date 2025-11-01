import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDate,
  Min,
  ValidateNested,
} from 'class-validator';
import { NpcDto } from 'src/loots/dto/create-loot.dto';
import { TIMER_LIMITS } from 'src/timers/constants/timer-limits';

export class CreateTimerFromGameClientDto {
  @IsNumber()
  @Min(TIMER_LIMITS.MIN_RESP_BASE_SECONDS)
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

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => NpcDto)
  npc: NpcDto;

  @IsNotEmpty()
  @IsString()
  characterId: string;

  @IsNotEmpty()
  @IsString()
  accountId: string;

  @IsOptional()
  @IsString()
  tempId?: string;
}

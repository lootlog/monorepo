import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { NpcDto } from 'src/loots/dto/create-loot.dto';

export class CreateTimerDto {
  @IsNumber()
  respBaseSeconds: number;

  @IsOptional()
  respawnRandomness: number;

  @IsNotEmpty()
  @IsString()
  world: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => NpcDto)
  npc: NpcDto;
}

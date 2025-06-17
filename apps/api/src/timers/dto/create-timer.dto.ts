import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { NpcDto } from 'src/loots/dto/create-loot.dto';

export class CreateTimerDto {
  @IsNumber()
  @Min(2)
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

  @IsNotEmpty()
  @IsString()
  characterId: string;

  @IsNotEmpty()
  @IsString()
  accountId: string;
}

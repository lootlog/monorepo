import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { NpcDto } from 'src/loots/dto/create-loot.dto';

export class CreateNotificationDto {
  @IsString()
  @IsOptional()
  message: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NpcDto)
  npc: NpcDto;

  @IsArray()
  @IsNotEmpty()
  guildIds: string[];

  @IsString()
  @IsNotEmpty()
  world: string;
}

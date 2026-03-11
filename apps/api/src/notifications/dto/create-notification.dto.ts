import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { NpcDto } from "src/loots/dto/create-loot.dto";

export class CreateNotificationDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  message: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NpcDto)
  npc: NpcDto;

  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  guildIds: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  world: string;

  @IsOptional()
  @IsBoolean()
  isGatheringParty?: boolean;
}

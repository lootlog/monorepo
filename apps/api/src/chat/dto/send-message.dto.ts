import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { NpcDto } from "src/loots/dto/create-loot.dto";
import { Type } from "class-transformer";

class PartyGatheringDataDto {
  @IsString()
  @IsNotEmpty()
  notificationId: string;

  @IsString()
  @IsNotEmpty()
  discordId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  minLvl?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  maxLvl?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  world: string;
}

class ChatCharacterDataDto {
  @IsString()
  @IsNotEmpty()
  nick: string;

  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsNumber()
  @IsNotEmpty()
  acc: number;

  @IsNumber()
  @IsNotEmpty()
  lvl: number;

  @IsString()
  @IsNotEmpty()
  prof: string;

  @IsString()
  @IsNotEmpty()
  icon: string;
}

export enum MessageType {
  NORMAL = "NORMAL",
  NOTIFICATION = "NOTIFICATION",
  NPC = "NPC",
  PARTY_GATHERING = "PARTY_GATHERING",
}

export class SendMessageDto {
  @ApiProperty({
    description: "Chat message content",
    example: "Hello, guild!",
    minLength: 1,
    maxLength: 128,
  })
  @IsString()
  @MaxLength(128)
  message: string;

  @IsEnum(MessageType)
  @IsNotEmpty()
  type: MessageType;

  @ValidateNested()
  @Type(() => ChatCharacterDataDto)
  @IsNotEmpty()
  characterData: ChatCharacterDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NpcDto)
  npc?: NpcDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PartyGatheringDataDto)
  partyGathering?: PartyGatheringDataDto;
}

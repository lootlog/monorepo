import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NpcDto } from 'src/loots/dto/create-loot.dto';

export class SendMessageDto {
  @ApiProperty({
    description: 'Chat message content',
    example: 'Hello, guild!',
    minLength: 1,
    maxLength: 128,
  })
  @IsString()
  @MaxLength(128)
  message: string;
  @IsNotEmpty()
  type: MessageType;
  @IsNotEmpty()
  characterData: ChatCharacterData;
  @IsOptional()
  npc?: NpcDto;
  @IsOptional()
  partyGathering?: PartyGatheringData;
}

export enum MessageType {
  NORMAL = 'NORMAL',
  NOTIFICATION = 'NOTIFICATION',
  NPC = 'NPC',
  PARTY_GATHERING = 'PARTY_GATHERING',
}

export type PartyGatheringData = {
  notificationId: string;
  discordId: string;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
  world: string;
};

export type ChatCharacterData = {
  nick: string;
  id: number;
  acc: number;
  lvl: number;
  prof: string;
  icon: string;
};

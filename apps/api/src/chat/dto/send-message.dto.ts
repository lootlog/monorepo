import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
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
  @IsOptional()
  npc?: NpcDto;
}

export enum MessageType {
  NORMAL = 'NORMAL',
  NOTIFICATION = 'NOTIFICATION',
  NPC = 'NPC',
}

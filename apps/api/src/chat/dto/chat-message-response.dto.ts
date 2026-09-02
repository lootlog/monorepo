import { createZodDto } from "nestjs-zod";
import * as z from "zod";
import {
  ChatCharacterDataDto,
  MessageType,
  PartyGatheringDataDto,
  ReplyToMessageDto,
} from "#src/chat/dto/send-message.dto";

const ChatNpcResponseSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  location: z.string().min(1),
  lvl: z.number(),
  prof: z.string().min(1),
  wt: z.number(),
  hpp: z.number().optional(),
  icon: z.string().min(1),
  type: z.number(),
  x: z.number().optional(),
  y: z.number().optional(),
});

const ChatMessageResponseSchema = z.object({
  id: z.string().min(1),
  guildId: z.string().min(1),
  message: z.string().max(128),
  senderId: z.string().min(1),
  timestamp: z.string().datetime(),
  type: z.nativeEnum(MessageType),
  characterData: ChatCharacterDataDto.schema,
  npc: ChatNpcResponseSchema.optional(),
  partyGathering: PartyGatheringDataDto.schema.optional(),
  replyTo: ReplyToMessageDto.schema.optional(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
});

const ChatMessageActionResponseSchema = z.object({
  success: z.boolean(),
});

export class ChatMessageResponseDto extends createZodDto(
  ChatMessageResponseSchema,
) {}

export class ChatMessageActionResponseDto extends createZodDto(
  ChatMessageActionResponseSchema,
) {}

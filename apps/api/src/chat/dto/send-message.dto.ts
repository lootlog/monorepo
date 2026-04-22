import { z } from "zod";
import { createZodDto } from "nestjs-zod";

export enum MessageType {
  NORMAL = "NORMAL",
  NOTIFICATION = "NOTIFICATION",
  NPC = "NPC",
  PARTY_GATHERING = "PARTY_GATHERING",
}

const PartyGatheringDataSchema = z.object({
  notificationId: z.string().min(1),
  discordId: z.string().min(1),
  description: z.string().max(200).optional(),
  minLvl: z.number().min(1).max(500).optional(),
  maxLvl: z.number().min(1).max(500).optional(),
  world: z.string().min(1).max(50),
});

export class PartyGatheringDataDto extends createZodDto(
  PartyGatheringDataSchema,
) {}

const ChatCharacterDataSchema = z.object({
  nick: z.string().min(1),
  id: z.number(),
  acc: z.number(),
  lvl: z.number(),
  prof: z.string().min(1),
  icon: z.string().min(1),
});

export class ChatCharacterDataDto extends createZodDto(
  ChatCharacterDataSchema,
) {}

const ReplyToMessageSchema = z.object({
  messageId: z.string().min(1),
  senderNick: z.string().min(1),
  message: z.string().max(128),
  type: z.enum([MessageType.NORMAL, MessageType.NOTIFICATION]),
});

export class ReplyToMessageDto extends createZodDto(ReplyToMessageSchema) {}

const NpcEmbeddedSchema = z.object({
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

const SendMessageSchema = z.object({
  message: z.string().max(128),
  type: z.nativeEnum(MessageType),
  characterData: ChatCharacterDataSchema,
  npc: NpcEmbeddedSchema.optional(),
  partyGathering: PartyGatheringDataSchema.optional(),
  replyTo: ReplyToMessageSchema.optional(),
});

export class SendMessageDto extends createZodDto(SendMessageSchema) {}

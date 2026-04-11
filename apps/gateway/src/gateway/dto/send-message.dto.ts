import { z } from "zod";
import { createZodDto } from "nestjs-zod";

export enum MessageType {
  NORMAL = "NORMAL",
  NOTIFICATION = "NOTIFICATION",
  NPC = "NPC",
  PARTY_GATHERING = "PARTY_GATHERING",
}

const NpcSchema = z.object({
  id: z.number(),
  name: z.string(),
  lvl: z.number(),
  x: z.number(),
  y: z.number(),
  prof: z.string(),
  type: z.string(),
  margonemType: z.string(),
  location: z.string(),
  wt: z.string(),
  icon: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lootId: z.number().nullable(),
});

const PartyGatheringDataSchema = z.object({
  notificationId: z.string(),
  discordId: z.string(),
  description: z.string().optional(),
  minLvl: z.number().optional(),
  maxLvl: z.number().optional(),
  world: z.string(),
});

const ChatCharacterDataSchema = z.object({
  nick: z.string(),
  id: z.number(),
  acc: z.number(),
  lvl: z.number(),
  prof: z.string(),
  icon: z.string(),
});

const SendMessageSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  message: z.string(),
  senderId: z.string(),
  timestamp: z.string(),
  type: z.nativeEnum(MessageType),
  characterData: ChatCharacterDataSchema,
  npc: NpcSchema.optional(),
  partyGathering: PartyGatheringDataSchema.optional(),
});

export class SendMessageDto extends createZodDto(SendMessageSchema) {}

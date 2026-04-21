import { useQuery } from "@tanstack/react-query";
import { fetchChatMessages } from "@/api";

export type {
  ChatMessage,
  ChatCharacterData,
  ChatNpc,
  MessageType,
  PartyGatheringChatData,
} from "@/api";

export const QUERY_KEY = "guild-messages";

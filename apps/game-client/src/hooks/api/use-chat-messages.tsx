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

export const useChatMessages = (guildId?: string) => {
  const query = useQuery({
    queryKey: [QUERY_KEY, guildId],
    queryFn: () => fetchChatMessages(guildId as string),
    enabled: !!guildId && guildId !== "all",
    gcTime: Infinity,
    staleTime: 5 * 60 * 1000,
  });

  return query;
};

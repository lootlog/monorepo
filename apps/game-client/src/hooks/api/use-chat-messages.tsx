import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { API_URL } from "@/config/api";

export type ChatMessage = {
  id: string;
  guildId: string;
  message: string;
  senderId: string;
  timestamp: string;
};

export type GetChatMessagesOptions = {
  guildId: string;
};

export const QUERY_KEY = "guild-messages";

export const useChatMessages = ({ guildId }: GetChatMessagesOptions) => {
  const { client } = useAuthenticatedApiClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, guildId],
    queryFn: () =>
      client.get<ChatMessage[]>(`${API_URL}/guilds/${guildId}/chat-messages`),
    enabled: !!guildId,
    select: (response) => response.data,
  });

  return query;
};

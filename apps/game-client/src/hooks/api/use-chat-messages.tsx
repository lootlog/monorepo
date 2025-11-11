import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { API_URL } from "@/config/api";
import { AxiosInstance } from "axios";

export type ChatMessage = {
  id: string;
  guildId: string;
  message: string;
  senderId: string;
  timestamp: string;
  notification: boolean;
};

export const QUERY_KEY = "guild-messages";

export const useChatMessages = (guildId?: string) => {
  const { client } = useAuthenticatedApiClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, guildId],
    queryFn: () =>
      client.get<ChatMessage[]>(`${API_URL}/guilds/${guildId}/chat-messages`),
    enabled: !!guildId && guildId !== "all",
    gcTime: Infinity,
    staleTime: 5 * 60 * 1000,
    select: (response) => response.data,
  });

  return query;
};
export const fetchChatMessages = async (
  client: AxiosInstance,
  guildId: string,
): Promise<ChatMessage[]> => {
  const response = await client.get<ChatMessage[]>(
    `${API_URL}/guilds/${guildId}/chat-messages`,
  );
  return response.data;
};

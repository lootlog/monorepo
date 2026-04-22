import type { QueryClient } from "@tanstack/react-query";
import { getChatControllerGetChatMessagesQueryKey } from "@/lib/api/generated/main/chat/chat";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@/lib/api/generated/main/model";

type ChatMessagesCacheUpdater =
  | ChatMessageType[]
  | ((
      messages: ChatMessageType[] | undefined,
    ) => ChatMessageType[] | undefined);

export const updateChatMessagesCache = ({
  guildId,
  queryClient,
  updater,
}: {
  guildId: string;
  queryClient: QueryClient;
  updater: ChatMessagesCacheUpdater;
}) => {
  queryClient.setQueryData(
    getChatControllerGetChatMessagesQueryKey({ guildId }),
    updater,
  );
};

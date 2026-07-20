import { useEffect, useState } from "react";
import { useChatMessagesListener } from "@/features/chat/hooks/use-chat-messages";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Game } from "@/lib/game";
import { storageKey } from "@/lib/storage-key";
import { useChatStore } from "@/store/chat.store";
import { useWindowsStore } from "@/store/windows.store";
import { ChatView } from "./chat-view";
import {
  clearAllChatUnreadCounts,
  clearChatUnreadCount,
  incrementChatUnreadCount,
  type ChatUnreadCountByGuildId,
} from "./chat-unread.helpers";

const chatSelectedGuildKey = (accountId: string, characterId: string) =>
  storageKey(`ll:chat:selected-guild:${accountId}:${characterId}`);

export const Chat = () => {
  const isIntegratedMode = useChatStore((state) => state.isIntegratedMode);
  const open = useWindowsStore((state) => state.chat.open);
  const characterId = String(Game.hero.id);
  const accountId = String(Game.hero.account);
  const [selectedGuildId, setSelectedGuildId] = useLocalStorage(
    chatSelectedGuildKey(accountId, characterId),
    "",
  );
  const [unreadCountByGuildId, setUnreadCountByGuildId] =
    useState<ChatUnreadCountByGuildId>({});
  const isChatViewVisible =
    open && !(isIntegratedMode && Game.interface === "ni");

  useChatMessagesListener({
    prefetchMembers: isChatViewVisible,
    onRemoteMessage: (message) => {
      if (!selectedGuildId || selectedGuildId === "all") {
        return;
      }

      if (message.guildId === selectedGuildId) {
        return;
      }

      setUnreadCountByGuildId((currentUnreadCountByGuildId) =>
        incrementChatUnreadCount({
          unreadCountByGuildId: currentUnreadCountByGuildId,
          guildId: message.guildId,
        }),
      );
    },
  });

  useEffect(() => {
    if (!selectedGuildId) {
      return;
    }

    if (selectedGuildId === "all") {
      setUnreadCountByGuildId(clearAllChatUnreadCounts());
      return;
    }

    setUnreadCountByGuildId((currentUnreadCountByGuildId) =>
      clearChatUnreadCount({
        unreadCountByGuildId: currentUnreadCountByGuildId,
        guildId: selectedGuildId,
      }),
    );
  }, [selectedGuildId]);

  if (!isChatViewVisible) {
    return null;
  }

  return (
    <ChatView
      selectedGuildId={selectedGuildId}
      setSelectedGuildId={setSelectedGuildId}
      unreadCountByGuildId={unreadCountByGuildId}
    />
  );
};

import { useState } from "react";
import { useChatMessagesListener } from "@/features/chat/hooks/use-chat-messages";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useWindowPresence } from "@/hooks/ui/use-window-presence";
import { storageKey } from "@/lib/storage-key";
import { useChatStore } from "@/store/chat.store";
import { useGameStore } from "@/store/game.store";
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
  const characterId = useGameStore(
    (state) => state.game?.hero.characterId ?? "",
  );
  const accountId = useGameStore((state) => state.game?.hero.accountId ?? "");
  const gameInterface = useGameStore((state) => state.game?.interface);
  const [selectedGuildId, setSelectedGuildId] = useLocalStorage(
    chatSelectedGuildKey(accountId, characterId),
    "",
  );
  const [unreadCountByGuildId, setUnreadCountByGuildId] =
    useState<ChatUnreadCountByGuildId>({});
  const isChatViewVisible =
    open && !(isIntegratedMode && gameInterface === "ni");
  const { shouldRender: shouldRenderChatView } =
    useWindowPresence(isChatViewVisible);

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

  const handleSelectedGuildChange: typeof setSelectedGuildId = (update) => {
    const nextGuildId =
      typeof update === "function" ? update(selectedGuildId) : update;
    setSelectedGuildId(nextGuildId);
    if (!nextGuildId) return;

    setUnreadCountByGuildId((currentUnreadCountByGuildId) =>
      nextGuildId === "all"
        ? clearAllChatUnreadCounts()
        : clearChatUnreadCount({
            unreadCountByGuildId: currentUnreadCountByGuildId,
            guildId: nextGuildId,
          }),
    );
  };

  if (!shouldRenderChatView) {
    return null;
  }

  return (
    <ChatView
      isOpen={isChatViewVisible}
      selectedGuildId={selectedGuildId}
      setSelectedGuildId={handleSelectedGuildChange}
      unreadCountByGuildId={unreadCountByGuildId}
    />
  );
};

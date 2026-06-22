import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { storageKey } from "@/lib/storage-key";
import { useWindowsStore } from "@/store/windows.store";
import { useChatMessagesListener } from "@/features/chat/hooks/use-chat-messages";
import { GuildSwitcher } from "@/components/guild-switcher";
import { Game } from "@/lib/game";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@/lib/api/generated/main/users/users";
import { getGuildNamesById } from "@/lib/api/generated-helpers";
import { type ChatFilter, useChatStore } from "@/store/chat.store";
import { ChatDateDivider } from "./components/chat-date-divider";
import { ChatMessage } from "./components/chat-message";
import { ChatNpcMessage } from "./components/chat-npc-message";
import { ChatInput } from "@/features/chat/components/chat-input";
import { ChatWindowActions } from "@/features/chat/components/chat-window-actions";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  getCurrentChatMessages,
  getChatRenderableMessages,
  getChatRenderableMessagesSignature,
  getNextSelectedGuildId,
  hasVisibleChatMessages,
} from "./chat.helpers";
import { canReplyToChatMessage } from "./chat-reply.helpers";
import {
  clearAllChatUnreadCounts,
  clearChatUnreadCount,
  incrementChatUnreadCount,
  type ChatUnreadCountByGuildId,
} from "./chat-unread.helpers";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@/lib/api/generated/main/model";
import { useChatGuildData } from "./hooks/use-chat-guild-data";
import { useShallow } from "zustand/react/shallow";

const chatSelectedGuildKey = (accountId: string, characterId: string) =>
  storageKey(`ll:chat:selected-guild:${accountId}:${characterId}`);
const CHAT_AUTOSCROLL_THRESHOLD_PX = 100;

export const Chat = () => {
  const { t } = useTranslation("chat");
  const {
    isIntegratedMode,
    isChatInputEnabled,
    setChatInputEnabled,
    toggleChatInputEnabled,
    chatFilter,
    setChatFilter,
    filtersVisible,
    toggleFiltersVisible,
    setReplyDraft,
  } = useChatStore(
    useShallow((state) => ({
      isIntegratedMode: state.isIntegratedMode,
      isChatInputEnabled: state.isChatInputEnabled,
      setChatInputEnabled: state.setChatInputEnabled,
      toggleChatInputEnabled: state.toggleChatInputEnabled,
      chatFilter: state.chatFilter,
      setChatFilter: state.setChatFilter,
      filtersVisible: state.filtersVisible,
      toggleFiltersVisible: state.toggleFiltersVisible,
      setReplyDraft: state.setReplyDraft,
    })),
  );

  const characterId = String(Game.hero.id);
  const accountId = String(Game.hero.account);
  const open = useWindowsStore((state) => state.chat.open);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const [selectedGuildId, setSelectedGuildId] = useLocalStorage(
    chatSelectedGuildKey(accountId, characterId),
    "",
  );
  const [unreadCountByGuildId, setUnreadCountByGuildId] =
    useState<ChatUnreadCountByGuildId>({});
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      refetchOnMount: false,
      staleTime: 1000 * 60 * 5,
    },
  });

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useChatMessagesListener({
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

  const { membersByGuildId, mentionContextsByGuildId, messagesByGuildId } =
    useChatGuildData({
      currentCharacterNick: Game.hero.nick,
      guilds,
      selectedGuildId,
    });

  const isUserNearBottomRef = useRef(true);
  const scrollPendingRef = useRef(true);
  const prevRenderSignatureRef = useRef("");

  const handleScroll = () => {
    const viewport = scrollAreaRef.current;
    if (!viewport) return;

    const scrollPos = viewport.scrollTop + viewport.clientHeight;
    const scrollHeight = viewport.scrollHeight;

    isUserNearBottomRef.current =
      scrollHeight - scrollPos <= CHAT_AUTOSCROLL_THRESHOLD_PX;
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const viewport = scrollAreaRef.current;
    if (!viewport) {
      return;
    }

    viewport.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [open]);

  useEffect(() => {
    scrollPendingRef.current = true;
    prevRenderSignatureRef.current = "";
    isUserNearBottomRef.current = true;
  }, [selectedGuildId, chatFilter]);

  useEffect(() => {
    if (!open) {
      return;
    }

    scrollPendingRef.current = true;
    prevRenderSignatureRef.current = "";
    isUserNearBottomRef.current = true;
  }, [open]);

  useEffect(() => {
    const nextSelectedGuildId = getNextSelectedGuildId(selectedGuildId, guilds);

    if (nextSelectedGuildId) {
      setSelectedGuildId(nextSelectedGuildId);
    }
  }, [selectedGuildId, setSelectedGuildId, guilds]);

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

  const guildNamesById = getGuildNamesById(guilds);
  const chatFilters: { key: ChatFilter; label: string }[] = [
    { key: "all", label: t("filters.all") },
    { key: "normal", label: t("filters.normal") },
    { key: "npc", label: t("filters.npc") },
    { key: "party", label: t("filters.party") },
  ];
  const currentMessages = getCurrentChatMessages(
    messagesByGuildId,
    selectedGuildId,
    chatFilter,
  );
  const currentRenderableMessages = getChatRenderableMessages(currentMessages);
  const currentRenderSignature = getChatRenderableMessagesSignature(
    currentRenderableMessages,
  );
  const hasRenderableMessages = hasVisibleChatMessages(
    currentMessages,
    guildNamesById,
  );

  const handleReplyToMessage = (message: ChatMessageType) => {
    if (!canReplyToChatMessage(message)) {
      return;
    }

    setReplyDraft({
      guildId: message.guildId,
      messageId: message.id,
      senderNick: message.characterData.nick,
      message: message.message,
      type: message.type,
    });
    setChatInputEnabled(true);

    if (selectedGuildId === "all") {
      setSelectedGuildId(message.guildId);
    }
  };

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const viewport = scrollAreaRef.current;
    if (!viewport) {
      return;
    }

    if (scrollPendingRef.current) {
      if (hasRenderableMessages) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "instant" });
        scrollPendingRef.current = false;
        isUserNearBottomRef.current = true;
      }
      prevRenderSignatureRef.current = currentRenderSignature;
      return;
    }

    if (
      currentRenderSignature !== prevRenderSignatureRef.current &&
      isUserNearBottomRef.current
    ) {
      viewport.scrollTo({ top: viewport.scrollHeight });
      isUserNearBottomRef.current = true;
    }

    prevRenderSignatureRef.current = currentRenderSignature;
  }, [
    open,
    currentRenderSignature,
    currentRenderableMessages,
    hasRenderableMessages,
  ]);

  if (isIntegratedMode && Game.interface === "ni") {
    return <div />;
  }

  return (
    <AnimatedWindow isOpen={open} windowKey="chat">
      <DraggableWindow
        id="chat"
        title={t("window.title")}
        onClose={() => setOpen("chat", false)}
        minHeight={116}
        minWidth={242}
        actions=<ChatWindowActions
          chatInputEnabled={isChatInputEnabled}
          toggleChatInputEnabled={toggleChatInputEnabled}
          filtersVisible={filtersVisible}
          toggleFiltersVisible={toggleFiltersVisible}
        />
      >
        <div className="ll:flex ll:flex-col ll:h-full ll:w-full">
          <div className="ll:shrink-0 ll:pt-1 ll:pb-1">
            <GuildSwitcher
              allowAll
              value={selectedGuildId}
              onChange={setSelectedGuildId}
              unreadCountByGuildId={unreadCountByGuildId}
            />
          </div>
          {filtersVisible && (
            <div className="ll:shrink-0 ll:flex ll:gap-0.5 ll:px-1 ll:pb-1">
              {chatFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setChatFilter(filter.key)}
                  className={cn(
                    "ll:flex-1 ll:text-[10px] ll:py-0.5 ll:rounded-sm ll:border ll:transition-colors",
                    chatFilter === filter.key
                      ? "ll:bg-gray-600 ll:border-gray-500 ll:text-white"
                      : "ll:bg-transparent ll:border-gray-700 ll:text-gray-400 ll:hover:text-gray-300 ll:hover:border-gray-600",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}
          <div className="ll:flex-1 ll:overflow-hidden">
            <ScrollArea
              ref={scrollAreaRef}
              className="ll:h-full ll:w-full ll:box-border ll:border ll:rounded-sm ll:border-gray-400 ll:p-1"
            >
              <div
                className="ll:flex ll:w-full ll:min-w-0 ll:flex-col ll:gap-1 ll:overflow-x-hidden ll:rounded-lg"
                data-ll-draggable="false"
              >
                {currentRenderableMessages.length === 0 ? (
                  <div className="ll:flex ll:items-center ll:justify-center ll:h-full ll:text-gray-500 ll:text-xs">
                    {t("emptyState.noMessages")}
                  </div>
                ) : (
                  currentRenderableMessages.map((renderable) => {
                    if (renderable.kind === "date-divider") {
                      return (
                        <ChatDateDivider
                          key={renderable.key}
                          timestamp={renderable.timestamp}
                        />
                      );
                    }

                    const message = renderable.message;
                    const members = membersByGuildId[message.guildId] ?? {};

                    if (renderable.kind === "npc-group") {
                      return (
                        <ChatNpcMessage
                          key={renderable.key}
                          additionalSenderCount={
                            renderable.additionalSenderCount
                          }
                          all={selectedGuildId === "all"}
                          count={renderable.count}
                          guildName={guildNamesById[renderable.message.guildId]}
                          member={members[message.senderId]}
                          message={renderable.message}
                        />
                      );
                    }

                    return (
                      <ChatMessage
                        key={renderable.key}
                        message={message}
                        all={selectedGuildId === "all"}
                        guildName={guildNamesById[message.guildId]}
                        member={members[message.senderId]}
                        mentionContext={
                          mentionContextsByGuildId[message.guildId]
                        }
                        onReply={() => handleReplyToMessage(message)}
                      />
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
          {selectedGuildId !== "all" && isChatInputEnabled && (
            <ChatInput selectedGuildId={selectedGuildId} />
          )}
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};

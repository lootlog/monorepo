import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { DraggableWindow } from "@/components/draggable-window";
import { GuildSwitcher } from "@/components/guild-switcher";
import { ChatInput } from "@/features/chat/components/chat-input";
import { ChatMessageList } from "@/features/chat/components/chat-message-list";
import { ChatWindowActions } from "@/features/chat/components/chat-window-actions";
import { useChatGuildData } from "@/features/chat/hooks/use-chat-guild-data";
import { getGuildNamesById } from "@/lib/api/generated-helpers";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@/lib/api/generated/main/users/users";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@/lib/api/generated/main/model";
import { cn } from "@/lib/utils";
import { type ChatFilter, useChatStore } from "@/store/chat.store";
import { useGameStore } from "@/store/game.store";
import { useWindowsStore } from "@/store/windows.store";
import {
  getChatRenderableMessages,
  getChatRenderableMessagesSignature,
  getCurrentChatMessages,
  getNextSelectedGuildId,
  hasVisibleChatMessages,
} from "./chat.helpers";
import { canReplyToChatMessage } from "./chat-reply.helpers";
import type { ChatUnreadCountByGuildId } from "./chat-unread.helpers";

interface ChatViewProps {
  isOpen: boolean;
  selectedGuildId: string;
  setSelectedGuildId: Dispatch<SetStateAction<string>>;
  unreadCountByGuildId: ChatUnreadCountByGuildId;
}

export const ChatView = ({
  isOpen,
  selectedGuildId,
  setSelectedGuildId,
  unreadCountByGuildId,
}: ChatViewProps) => {
  const { t } = useTranslation("chat");
  const [scrollToBottomRequest, setScrollToBottomRequest] = useState(0);
  const {
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
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      refetchOnMount: false,
      staleTime: 1000 * 60 * 5,
    },
  });
  const currentCharacterNick = useGameStore(
    (state) => state.game?.hero.name ?? "",
  );
  const { membersByGuildId, mentionContextsByGuildId, messagesByGuildId } =
    useChatGuildData({
      currentCharacterNick,
      guilds,
      selectedGuildId,
    });
  useEffect(() => {
    const nextSelectedGuildId = getNextSelectedGuildId(selectedGuildId, guilds);

    if (nextSelectedGuildId) {
      setSelectedGuildId(nextSelectedGuildId);
    }
  }, [selectedGuildId, setSelectedGuildId, guilds]);

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

  return (
    <DraggableWindow
      isOpen={isOpen}
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
          <ChatMessageList
            key={`${selectedGuildId}:${chatFilter}`}
            ariaLabel={t("window.title")}
            emptyStateLabel={t("emptyState.noMessages")}
            guildNamesById={guildNamesById}
            hasRenderableMessages={hasRenderableMessages}
            membersByGuildId={membersByGuildId}
            mentionContextsByGuildId={mentionContextsByGuildId}
            onReplyToMessage={handleReplyToMessage}
            renderSignature={currentRenderSignature}
            renderables={currentRenderableMessages}
            scrollToBottomRequest={scrollToBottomRequest}
            selectedGuildId={selectedGuildId}
          />
        </div>
        {selectedGuildId !== "all" && isChatInputEnabled && (
          <ChatInput
            onMessageSent={() =>
              setScrollToBottomRequest((currentRequest) => currentRequest + 1)
            }
            selectedGuildId={selectedGuildId}
          />
        )}
      </div>
    </DraggableWindow>
  );
};

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
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/api-client/models/main/chat-message-response-dto-output";
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
import { useNpcTypeColors } from "@/hooks/api/use-settings-documents";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/types";
import { AsyncContent } from "@/components/async-content";
import { AsyncStatusIndicator } from "@/components/async-status-indicator";
import { useSocket } from "@/contexts/socket-context";
import { useVisibleLootlogGuilds } from "@/hooks/use-visible-lootlog-guilds";

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
  const { connected, joined } = useSocket();
  const {
    areVisibleGuildsResolved,
    guildsQuery,
    preferencesQuery: preferences,
    visibleGuilds: resolvedVisibleGuilds,
  } = useVisibleLootlogGuilds();
  const { npcTypeColors } = useNpcTypeColors();
  const chatAppearance =
    preferences.data?.chatAppearance ?? CHAT_APPEARANCE_READABLE_PRESET;
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
  const {
    error: guildsError,
    isFetching: guildsFetching,
    isLoading: guildsLoading,
    refetch: refetchGuilds,
  } = guildsQuery;
  const visibleGuilds = areVisibleGuildsResolved
    ? resolvedVisibleGuilds
    : undefined;
  const effectiveSelectedGuildId =
    visibleGuilds?.length === 0 ? "" : selectedGuildId;
  const currentCharacterNick = useGameStore(
    (state) => state.game?.hero.name ?? "",
  );
  const {
    failedGuildIds,
    hasMessagesResponse,
    error: chatInitialError,
    initialLoading: chatInitialLoading,
    membersByGuildId,
    mentionContextsByGuildId,
    messagesByGuildId,
    refreshing: chatRefreshing,
    retry: retryFailed,
  } = useChatGuildData({
    currentCharacterNick,
    guilds: visibleGuilds,
    selectedGuildId: effectiveSelectedGuildId,
  });
  useEffect(() => {
    const nextSelectedGuildId = getNextSelectedGuildId(
      selectedGuildId,
      visibleGuilds,
    );

    if (nextSelectedGuildId !== undefined) {
      setSelectedGuildId(nextSelectedGuildId);
    }
  }, [selectedGuildId, setSelectedGuildId, visibleGuilds]);

  const guildNamesById = getGuildNamesById(visibleGuilds);
  const chatFilters: { key: ChatFilter; label: string }[] = [
    { key: "all", label: t("filters.all") },
    { key: "normal", label: t("filters.normal") },
    { key: "npc", label: t("filters.npc") },
    { key: "party", label: t("filters.party") },
  ];
  const currentMessages = getCurrentChatMessages(
    messagesByGuildId,
    effectiveSelectedGuildId,
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
  const guildsLoaded = visibleGuilds !== undefined;
  const waitingForGuildSelection =
    guildsLoaded && visibleGuilds.length > 0 && !selectedGuildId;
  const initialLoading =
    (!guildsLoaded && (guildsLoading || preferences.isLoading)) ||
    waitingForGuildSelection ||
    chatInitialLoading;
  const initialError = !guildsLoaded
    ? (guildsError ?? preferences.error)
    : chatInitialError;
  const partialError =
    (guildsLoaded && Boolean(guildsError)) || failedGuildIds.length > 0;
  const refreshing =
    (guildsLoaded && guildsFetching) || (hasMessagesResponse && chatRefreshing);
  const stale = hasMessagesResponse && (!connected || !joined);
  const retryChatData = () => {
    if (guildsError) {
      void refetchGuilds();
    }
    if (preferences.error) {
      void preferences.refetch();
    }
    retryFailed();
  };

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
        <div className="ll:relative ll:flex-1 ll:overflow-hidden">
          <div className="ll:pointer-events-auto ll:absolute ll:right-1 ll:top-1 ll:z-20">
            <AsyncStatusIndicator
              active={partialError}
              kind="error"
              label={
                failedGuildIds.length > 0
                  ? t("states.partialError", {
                      count: failedGuildIds.length,
                    })
                  : t("states.refreshError")
              }
              onRetry={retryChatData}
              retryLabel={t("actions.retry", { ns: "common" })}
            />
            <AsyncStatusIndicator
              active={!partialError && stale}
              kind="warning"
              label={t("states.offline")}
            />
            <AsyncStatusIndicator
              active={!partialError && !stale && refreshing}
              delay
              kind="loading"
              label={t("states.refreshing")}
            />
          </div>
          <AsyncContent
            error={initialError}
            errorLabel={t("states.loadError")}
            isLoading={initialLoading}
            loadingLabel={t("states.loading")}
            onRetry={retryChatData}
            retryLabel={t("actions.retry", { ns: "common" })}
          >
            <ChatMessageList
              appearance={chatAppearance}
              npcTypeColors={npcTypeColors}
              key={`${effectiveSelectedGuildId}:${chatFilter}`}
              ariaLabel={t("window.title")}
              emptyStateTitle={t(
                effectiveSelectedGuildId === "all"
                  ? "emptyState.allTitle"
                  : "emptyState.guildTitle",
              )}
              guildNamesById={guildNamesById}
              hasRenderableMessages={hasRenderableMessages}
              membersByGuildId={membersByGuildId}
              mentionContextsByGuildId={mentionContextsByGuildId}
              onReplyToMessage={handleReplyToMessage}
              renderSignature={currentRenderSignature}
              renderables={currentRenderableMessages}
              scrollToBottomRequest={scrollToBottomRequest}
              selectedGuildId={effectiveSelectedGuildId}
            />
          </AsyncContent>
        </div>
        {Boolean(effectiveSelectedGuildId) &&
          effectiveSelectedGuildId !== "all" &&
          isChatInputEnabled && (
            <ChatInput
              onMessageSent={() =>
                setScrollToBottomRequest((currentRequest) => currentRequest + 1)
              }
              selectedGuildId={effectiveSelectedGuildId}
            />
          )}
      </div>
    </DraggableWindow>
  );
};

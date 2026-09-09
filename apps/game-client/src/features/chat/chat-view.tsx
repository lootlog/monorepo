import { ChatFilterSwitcher } from "./components/chat-filter-switcher";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DraggableWindow } from "@/components/draggable-window";
import { GuildSwitcher } from "@/components/guild-switcher";
import { ChatInput } from "./components/chat-input";
import { ChatMessageList } from "./components/chat-message-list";
import { ChatWindowActions } from "./components/chat-window-actions";
import { ChatGatheringBar } from "./components/chat-gathering-bar";
import { useChatGuildData } from "./hooks/use-chat-guild-data";
import { getGuildNamesById } from "@/lib/api/generated-helpers";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/client/main";
import { useChatStore } from "@/store/chat.store";
import { useGameStore } from "@/store/game.store";
import { useWindowsStore } from "@/store/windows.store";
import {
  groupDuplicateChatMessages,
  getVisibleChatMessageAliases,
  getMessagesForSelectedGuild,
  getChatRenderableMessages,
  getCurrentChatMessages,
  getNextSelectedGuildId,
} from "./chat.helpers";
import {
  canReplyToChatMessage,
  resolveChatReplyNames,
} from "./chat-reply.helpers";
import { useNpcTypeColors } from "@/hooks/api/use-settings-documents";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import { AsyncContent } from "@/components/async-content";
import { AsyncStatusIndicator } from "@/components/async-status-indicator";
import { useSocket } from "@/contexts/socket-context";
import { useVisibleLootlogGuilds } from "@/hooks/use-visible-lootlog-guilds";
import {
  getChatUnreadSummary,
  markChatMessagesRead,
  prioritizeChatMessage,
  retainChatReadEntries,
  type ChatReadState,
} from "./chat-read-state";
import {
  hasCurrentUserMention,
  normalizeChatMentionName,
} from "./chat-mentions.helpers";
import type { ChatScrollPosition } from "./components/chat-transcript";

interface ChatViewProps {
  isOpen: boolean;
  embedded: boolean;
  selectedGuildId: string;
  setSelectedGuildId: (guildId: string) => void;
  readState: ChatReadState;
  setReadState: (update: (state: ChatReadState) => ChatReadState) => void;
  getPosition: (key: string) => ChatScrollPosition | undefined;
  savePosition: (key: string, position: ChatScrollPosition) => void;
}

type ChatAsyncStateInput = {
  chatInitialError: unknown;
  chatInitialLoading: boolean;
  chatRefreshing: boolean;
  connected: boolean;
  failedGuildCount: number;
  guildsError: unknown;
  guildsFetching: boolean;
  guildsLoading: boolean;
  hasMessagesResponse: boolean;
  joined: boolean;
  preferencesError: unknown;
  preferencesLoading: boolean;
  selectedGuildId: string;
  visibleGuildCount?: number;
};

const resolveChatAsyncState = ({
  chatInitialError,
  chatInitialLoading,
  chatRefreshing,
  connected,
  failedGuildCount,
  guildsError,
  guildsFetching,
  guildsLoading,
  hasMessagesResponse,
  joined,
  preferencesError,
  preferencesLoading,
  selectedGuildId,
  visibleGuildCount,
}: ChatAsyncStateInput) => {
  const guildsLoaded = visibleGuildCount !== undefined;
  const waitingForGuildSelection =
    guildsLoaded && visibleGuildCount > 0 && !selectedGuildId;
  const initialLoading = guildsLoaded
    ? waitingForGuildSelection || chatInitialLoading
    : guildsLoading || preferencesLoading || chatInitialLoading;
  const initialError = guildsLoaded
    ? chatInitialError
    : (guildsError ?? preferencesError);
  const partialError =
    (guildsLoaded && Boolean(guildsError)) || failedGuildCount > 0;
  const refreshing = guildsLoaded
    ? guildsFetching || (hasMessagesResponse && chatRefreshing)
    : hasMessagesResponse && chatRefreshing;
  const stale = hasMessagesResponse && (!connected || !joined);

  return {
    initialError,
    initialLoading,
    partialError,
    refreshing,
    showOfflineStatus: !partialError && stale,
    showRefreshingStatus: !partialError && !stale && refreshing,
  };
};

const resolveChatGuildTargets = (
  selectedGuildId: string,
  visibleGuilds:
    | ReturnType<typeof useVisibleLootlogGuilds>["visibleGuilds"]
    | undefined,
) => ({
  effectiveSelectedGuildId: visibleGuilds?.length === 0 ? "" : selectedGuildId,
  resolvedComposeGuildId: visibleGuilds?.some(
    (guild) => guild.id === selectedGuildId,
  )
    ? selectedGuildId
    : "",
});

export const ChatView = ({
  isOpen,
  embedded,
  selectedGuildId,
  setSelectedGuildId,
  readState,
  setReadState,
  getPosition,
  savePosition,
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
  const filtersVisible = useChatStore((state) => state.filtersVisible);
  const chatFilter = useChatStore((state) => state.chatFilter);
  const gameInterface = useGameStore((state) => state.game?.interface);
  const currentCharacterNick = useGameStore(
    (state) => state.game?.hero.name ?? "",
  );
  const characterId = useGameStore(
    (state) => state.game?.hero.characterId ?? "",
  );
  const world = useGameStore((state) => state.game?.world ?? "");
  const {
    error: guildsError,
    isFetching: guildsFetching,
    isLoading: guildsLoading,
    refetch: refetchGuilds,
  } = guildsQuery;
  const visibleGuilds = areVisibleGuildsResolved
    ? resolvedVisibleGuilds
    : undefined;
  const { effectiveSelectedGuildId, resolvedComposeGuildId } =
    resolveChatGuildTargets(selectedGuildId, visibleGuilds);
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
    const next = getNextSelectedGuildId(selectedGuildId, visibleGuilds);
    if (next !== undefined) setSelectedGuildId(next);
  }, [selectedGuildId, setSelectedGuildId, visibleGuilds]);
  useEffect(() => {
    if (!visibleGuilds) return;
    setReadState((current) => {
      let next = current;
      const allowed = new Set(visibleGuilds.map((guild) => guild.id));
      if (Object.keys(current).some((guildId) => !allowed.has(guildId))) {
        next = Object.fromEntries(
          Object.entries(current).filter(([guildId]) => allowed.has(guildId)),
        );
      }
      if (!hasMessagesResponse) return next;
      for (const [guildId, messages] of Object.entries(messagesByGuildId)) {
        if (failedGuildIds.includes(guildId)) continue;
        next = retainChatReadEntries(
          next,
          guildId,
          new Set(messages.map((message) => message.id)),
        );
        const context = mentionContextsByGuildId[guildId];
        for (const message of messages) {
          const repliesToMe =
            message.replyTo &&
            context?.currentUserNames?.some(
              (name) =>
                normalizeChatMentionName(name) ===
                normalizeChatMentionName(message.replyTo?.senderNick ?? ""),
            );
          if (repliesToMe || hasCurrentUserMention(message.message, context))
            next = prioritizeChatMessage(next, guildId, message.id);
        }
      }
      return next;
    });
  }, [
    visibleGuilds,
    hasMessagesResponse,
    messagesByGuildId,
    mentionContextsByGuildId,
    failedGuildIds,
    setReadState,
  ]);

  const guildNamesById = getGuildNamesById(visibleGuilds);
  const unread = getChatUnreadSummary(readState, effectiveSelectedGuildId);
  const unreadCountByGuildId = Object.fromEntries(
    (visibleGuilds ?? []).map((guild) => {
      const summary = getChatUnreadSummary(readState, guild.id);
      return [guild.id, summary.attention];
    }),
  );
  const effectiveFilter = !filtersVisible
    ? "all"
    : chatFilter === "npc" || chatFilter === "party"
      ? "reports"
      : chatFilter;
  const currentMessages = resolveChatReplyNames(
    getCurrentChatMessages(
      messagesByGuildId,
      effectiveSelectedGuildId,
      effectiveFilter,
    ),
    messagesByGuildId,
    membersByGuildId,
  );
  const currentRenderableMessages = getChatRenderableMessages(currentMessages);
  const selectedMessageGroups = groupDuplicateChatMessages(
    getMessagesForSelectedGuild(messagesByGuildId, effectiveSelectedGuildId),
  );
  const positionKey = `${world}:${characterId}:${effectiveSelectedGuildId}:${effectiveFilter}`;
  const {
    initialError,
    initialLoading,
    partialError,
    showOfflineStatus,
    showRefreshingStatus,
  } = resolveChatAsyncState({
    chatInitialError,
    chatInitialLoading,
    chatRefreshing,
    connected,
    failedGuildCount: failedGuildIds.length,
    guildsError,
    guildsFetching,
    guildsLoading,
    hasMessagesResponse,
    joined,
    preferencesError: preferences.error,
    preferencesLoading: preferences.isLoading,
    selectedGuildId,
    visibleGuildCount: visibleGuilds?.length,
  });
  const retryChatData = () => {
    if (guildsError) void refetchGuilds();
    if (preferences.error) void preferences.refetch();
    retryFailed();
  };
  const handleReplyToMessage = (message: ChatMessageType) => {
    if (!canReplyToChatMessage(message)) return;
    useChatStore.getState().setReplyDraft({
      guildId: message.guildId,
      messageId: message.id,
      senderNick:
        membersByGuildId[message.guildId]?.[message.senderId]?.name ??
        message.characterData.nick,
      message: message.message,
      type: message.type,
    });
  };
  const actions = (
    <ChatWindowActions
      integrated={embedded}
      canIntegrate={gameInterface === "ni"}
      toggleIntegrated={() => {
        useWindowsStore.getState().setOpen("chat", true);
        useChatStore.getState().toggleIntegratedMode();
      }}
    />
  );
  const content = (
    <div className="ll:flex ll:size-full ll:min-h-0 ll:flex-col">
      <div className="ll:flex ll:shrink-0 ll:items-center ll:gap-1 ll:p-1">
        <GuildSwitcher
          allowAll
          className="ll:min-w-0 ll:flex-1"
          value={selectedGuildId}
          onChange={(guildId) => {
            setSelectedGuildId(guildId);
          }}
          unreadCountByGuildId={unreadCountByGuildId}
          unreadGuildIds={
            new Set(
              (visibleGuilds ?? [])
                .filter(
                  (guild) =>
                    getChatUnreadSummary(readState, guild.id).ids.size > 0,
                )
                .map((guild) => guild.id),
            )
          }
        />
        {embedded && actions}
      </div>
      {filtersVisible && (
        <ChatFilterSwitcher
          value={effectiveFilter}
          onValueChange={useChatStore.getState().setChatFilter}
          unread={unread}
        />
      )}
      <div className="ll:relative ll:min-h-0 ll:flex-1 ll:overflow-hidden">
        <div className="ll:pointer-events-auto ll:absolute ll:right-1 ll:top-1 ll:z-20">
          <AsyncStatusIndicator
            active={partialError}
            kind="error"
            label={
              failedGuildIds.length > 0
                ? t("states.partialError", { count: failedGuildIds.length })
                : t("states.refreshError")
            }
            onRetry={retryChatData}
            retryLabel={t("actions.retry", { ns: "common" })}
          />
          <AsyncStatusIndicator
            active={showOfflineStatus}
            kind="warning"
            label={t("states.offline")}
          />
          <AsyncStatusIndicator
            active={showRefreshingStatus}
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
            key={positionKey}
            appearance={chatAppearance}
            npcTypeColors={npcTypeColors}
            ariaLabel={t("window.title")}
            emptyStateTitle={t(
              effectiveSelectedGuildId === "all"
                ? "emptyState.allTitle"
                : "emptyState.guildTitle",
            )}
            guildNamesById={guildNamesById}
            membersByGuildId={membersByGuildId}
            mentionContextsByGuildId={mentionContextsByGuildId}
            onReplyToMessage={handleReplyToMessage}
            renderables={currentRenderableMessages}
            selectedGuildId={effectiveSelectedGuildId}
            isActive={isOpen}
            unreadIds={unread.ids}
            onMessagesSeen={(ids) =>
              setReadState((current) =>
                markChatMessagesRead(
                  current,
                  getVisibleChatMessageAliases(selectedMessageGroups, ids),
                ),
              )
            }
            position={getPosition(positionKey)}
            onPositionChange={(position) => {
              savePosition(positionKey, position);
            }}
          />
        </AsyncContent>
      </div>
      <div className="ll:shrink-0">
        <ChatGatheringBar isVisible={isOpen} npcTypeColors={npcTypeColors} />
        <div>
          {!resolvedComposeGuildId && (
            <p className="ll:text-[10px] ll:text-muted-foreground">
              {t("quickActions.selectOrganization")}
            </p>
          )}
          <ChatInput
            variant="borderless"
            selectedGuildId={resolvedComposeGuildId || undefined}
          />
        </div>
      </div>
    </div>
  );
  if (embedded) return content;
  return (
    <DraggableWindow
      isOpen={isOpen}
      id="chat"
      contentClassName="ll:-mx-1 ll:-mb-1"
      title={t("window.title")}
      onClose={() => useWindowsStore.getState().setOpen("chat", false)}
      minHeight={260}
      // minWidth={260}
      actions={actions}
    >
      {content}
    </DraggableWindow>
  );
};

import { ChatFilterSwitcher } from "./components/chat-filter-switcher";
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { ChatViewHeader } from "./components/chat-view-header";
import { ChatComposeArea } from "./components/chat-compose-area";
import { ChatMessageList } from "./components/chat-message-list";
import { ChatWindowActions } from "./components/chat-window-actions";
import { ChatGatheringBar } from "./components/chat-gathering-bar";
import { useChatGuildData } from "./hooks/use-chat-guild-data";
import { getGuildNamesById } from "@/lib/api/generated-helpers";
import {
  type ChatMessageResponseDtoOutput as ChatMessageType,
  type MemberSummaryResponseDtoOutput as GuildMember,
  useChatControllerDeleteChatMessage,
} from "@lootlog/client/main";
import { updateChatMessagesCache } from "./chat-query-cache.helpers";
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
  removeChatMessage,
} from "./chat.helpers";
import { isChatNpcType } from "./hooks/use-hidden-npc-types";
import {
  canReplyToChatMessage,
  resolveChatReplyNames,
} from "./chat-reply.helpers";
import {
  useChatAppearanceSettings,
  useNpcTypeColors,
} from "@/features/settings/persistence/use-appearance-settings";
import { useHiddenNpcTypes } from "@/features/chat/hooks/use-hidden-npc-types";
import { AsyncContent } from "@/components/async-content";
import { ChatConnectionStatus } from "./components/chat-connection-status";
import { useSocket } from "@/contexts/socket-context";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import {
  getChatUnreadSummary,
  getChatUnreadSummaryByGuildId,
  markChatMessagesRead,
  reconcileChatReadState,
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
    | ReturnType<typeof useLootlogGuilds>["visibleGuilds"]
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
  } = useLootlogGuilds();

  const { npcTypeColors } = useNpcTypeColors();
  const { chatAppearance } = useChatAppearanceSettings();

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

  // Reconcile persisted selection when this view's server access subscription changes.
  // oxlint-disable-next-line react-doctor/no-pass-data-to-parent
  useEffect(() => {
    const next = getNextSelectedGuildId(selectedGuildId, visibleGuilds);

    if (next !== undefined) setSelectedGuildId(next);
  }, [selectedGuildId, setSelectedGuildId, visibleGuilds]);
  const { hiddenNpcTypes } = useHiddenNpcTypes();
  const hiddenNpcTypeSet = new Set(hiddenNpcTypes);
  const hiddenNpcTypesKey = [...hiddenNpcTypes].sort().join(",");
  // Server message/access subscriptions and rank filters invalidate persisted read entries.
  // oxlint-disable-next-line react-doctor/no-pass-data-to-parent
  useEffect(() => {
    if (!visibleGuilds) return;
    const hidden = new Set(hiddenNpcTypesKey.split(",").filter(isChatNpcType));
    setReadState((current) =>
      reconcileChatReadState(current, {
        allowedGuildIds: new Set(visibleGuilds.map((guild) => guild.id)),
        failedGuildIds: new Set(failedGuildIds),
        hiddenNpcTypes: hidden,
        messagesByGuildId: hasMessagesResponse ? messagesByGuildId : {},
        hasAttention: (guildId, message) => {
          const context = mentionContextsByGuildId[guildId];

          const repliesToMe = Boolean(
            message.replyTo &&
            context?.currentUserNames?.some(
              (name) =>
                normalizeChatMentionName(name) ===
                normalizeChatMentionName(message.replyTo?.senderNick ?? ""),
            ),
          );

          return repliesToMe || hasCurrentUserMention(message.message, context);
        },
      }),
    );
  }, [
    visibleGuilds,
    hasMessagesResponse,
    hiddenNpcTypesKey,
    messagesByGuildId,
    mentionContextsByGuildId,
    failedGuildIds,
    setReadState,
  ]);

  const guildNamesById = getGuildNamesById(visibleGuilds);
  const unread = getChatUnreadSummary(readState, effectiveSelectedGuildId);

  const unreadByGuildId = getChatUnreadSummaryByGuildId(
    readState,
    (visibleGuilds ?? []).map((guild) => guild.id),
  );

  const unreadCountByGuildId = Object.fromEntries(
    Object.entries(unreadByGuildId).map(([guildId, summary]) => [
      guildId,
      summary.attention,
    ]),
  );

  const unreadGuildIds = new Set(
    Object.entries(unreadByGuildId).flatMap(([guildId, summary]) =>
      summary.ids.size > 0 ? [guildId] : [],
    ),
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
      hiddenNpcTypeSet,
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

  // Both callbacks feed memoized transcript rows (see ChatTranscriptRow), so
  // they must not change identity per render; they read the stores directly.
  const handleReplyToMessage = useCallback(
    (message: ChatMessageType, member?: GuildMember) => {
      if (!canReplyToChatMessage(message)) return;
      useChatStore.getState().setReplyDraft({
        guildId: message.guildId,
        messageId: message.id,
        senderNick: member?.name ?? message.characterData.nick,
        message: message.message,
        type: message.type,
      });
    },
    [],
  );

  const queryClient = useQueryClient();

  const [deletingMessageIds, setDeletingMessageIds] = useState<
    ReadonlySet<string>
  >(() => new Set());

  const { mutate: deleteChatMessage } = useChatControllerDeleteChatMessage({
    mutation: {
      onMutate: ({ pathParams }) => {
        setDeletingMessageIds(
          (current) => new Set([...current, pathParams.messageId]),
        );
      },
      onSuccess: (_response, { pathParams }) => {
        updateChatMessagesCache({
          guildId: pathParams.guildId,
          queryClient,
          updater: (old) =>
            old ? removeChatMessage(old, pathParams.messageId) : old,
        });
      },
      onSettled: (_response, _error, { pathParams }) => {
        setDeletingMessageIds((current) => {
          if (!current.has(pathParams.messageId)) return current;
          const next = new Set(current);
          next.delete(pathParams.messageId);

          return next;
        });
      },
    },
  });

  const handleDeleteMessage = useCallback(
    (message: ChatMessageType) => {
      deleteChatMessage({
        pathParams: { guildId: message.guildId, messageId: message.id },
      });
    },
    [deleteChatMessage],
  );

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
    <ChatGatheringBar isVisible={isOpen}>
      {(gatheringBar, hiddenGatherings, ownGathering) => (
        <div className="ll:flex ll:size-full ll:min-h-0 ll:flex-col">
          <ChatViewHeader
            selectedGuildId={selectedGuildId}
            onGuildChange={setSelectedGuildId}
            unreadCountByGuildId={unreadCountByGuildId}
            unreadGuildIds={unreadGuildIds}
            actions={embedded ? actions : null}
          />
          {filtersVisible && (
            <ChatFilterSwitcher
              value={effectiveFilter}
              onValueChange={useChatStore.getState().setChatFilter}
              unread={unread}
            />
          )}
          <div className="ll:relative ll:shrink-0 ll:z-10">{gatheringBar}</div>
          <ChatConnectionStatus
            status={{
              partialError,
              offline: showOfflineStatus,
              refreshing: showRefreshingStatus,
            }}
            failedGuildCount={failedGuildIds.length}
            onRetry={retryChatData}
          />
          <div className="ll:relative ll:min-h-0 ll:flex-1 ll:overflow-hidden">
            <div className="ll:absolute ll:right-2 ll:bottom-2 ll:z-20">
              {hiddenGatherings}
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
                onDeleteMessage={handleDeleteMessage}
                deletingMessageIds={deletingMessageIds}
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
          <ChatComposeArea
            guildId={resolvedComposeGuildId}
            ownGathering={ownGathering}
          />
        </div>
      )}
    </ChatGatheringBar>
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

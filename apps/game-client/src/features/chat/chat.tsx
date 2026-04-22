import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { useRef, useEffect, useLayoutEffect } from "react";
import { useQueries } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocalStorage } from "react-use";
import { storageKey } from "@/lib/storage-key";
import { useWindowsStore } from "@/store/windows.store";
import { useChatMessagesListener } from "@/features/chat/hooks/use-chat-messages";
import { GuildSwitcher } from "@/components/guild-switcher";
import { Game } from "@/lib/game";
import {
  chatControllerGetChatMessages,
  getChatControllerGetChatMessagesQueryKey,
} from "@/lib/api/generated/main/chat/chat";
import {
  getMembersControllerGetGuildMembersSummaryQueryKey,
  getMembersControllerGetMeQueryKey,
  membersControllerGetGuildMembersSummary,
  membersControllerGetMe,
} from "@/lib/api/generated/main/members/members";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@/lib/api/generated/main/users/users";
import {
  getRolesControllerGetGuildRolesQueryKey,
  rolesControllerGetGuildRoles,
} from "@/lib/api/generated/main/roles/roles";
import {
  getGuildIds,
  getGuildNamesById,
  mapGuildMembersByUserId,
} from "@/lib/api/generated-helpers";
import { type ChatFilter, useChatStore } from "@/store/chat.store";
import { ChatMessage } from "./components/chat-message";
import { ChatInput } from "@/features/chat/components/chat-input";
import { ChatWindowActions } from "@/features/chat/components/chat-window-actions";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  getCurrentChatMessages,
  getNextSelectedGuildId,
  hasVisibleChatMessages,
} from "./chat.helpers";
import { canReplyToChatMessage } from "./chat-reply.helpers";
import {
  getChatMentionMemberNames,
  getChatMentionRoleNames,
  getCurrentUserMentionNames,
  getCurrentUserMentionRoleNames,
  hasChatMentionToken,
  type ChatMentionContext,
} from "./chat-mentions.helpers";
import type {
  ChatMessageResponseDtoOutput as ChatMessageType,
  MemberSummaryResponseDtoOutput as GuildMember,
} from "@/lib/api/generated/main/model";

const chatSelectedGuildKey = (accountId: string, characterId: string) =>
  storageKey(`ll:chat:selected-guild:${accountId}:${characterId}`);

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
  } = useChatStore();

  const characterId = String(Game.hero.id);
  const accountId = String(Game.hero.account);
  const open = useWindowsStore((state) => state.chat.open);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const [selectedGuildId, setSelectedGuildId] = useLocalStorage(
    chatSelectedGuildKey(accountId, characterId),
    "",
  );
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      refetchOnMount: false,
      staleTime: 1000 * 60 * 5,
    },
  });

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useChatMessagesListener();

  const guildIds = getGuildIds(guilds);
  const guildIdsToLoad =
    selectedGuildId === "all"
      ? guildIds
      : selectedGuildId
        ? [selectedGuildId]
        : [];

  const messageQueries = useQueries({
    queries: guildIdsToLoad.map((guildId) => ({
      queryKey: getChatControllerGetChatMessagesQueryKey({ guildId }),
      queryFn: () => chatControllerGetChatMessages({ guildId }),
      enabled: !!guildId,
      gcTime: Infinity,
      staleTime: 5 * 60 * 1000,
    })),
  });
  const memberQueries = useQueries({
    queries: guildIdsToLoad.map((guildId) => ({
      queryKey: getMembersControllerGetGuildMembersSummaryQueryKey({ guildId }),
      queryFn: () => membersControllerGetGuildMembersSummary({ guildId }),
      enabled: !!guildId,
      gcTime: Infinity,
      staleTime: 5 * 60 * 1000,
    })),
  });
  const hasMentionCandidatesByGuildId = guildIdsToLoad.reduce<
    Record<string, boolean>
  >((result, guildId, index) => {
    const guildMessages = (messageQueries[index]?.data ??
      []) as ChatMessageType[];

    result[guildId] = guildMessages.some((message) => {
      return hasChatMentionToken(message.message);
    });

    return result;
  }, {});
  const currentMemberQueries = useQueries({
    queries: guildIdsToLoad.map((guildId) => ({
      queryKey: getMembersControllerGetMeQueryKey({ guildId }),
      queryFn: () => membersControllerGetMe({ guildId }),
      enabled: !!guildId && hasMentionCandidatesByGuildId[guildId],
      gcTime: Infinity,
      staleTime: 5 * 60 * 1000,
    })),
  });
  const roleQueries = useQueries({
    queries: guildIdsToLoad.map((guildId) => ({
      queryKey: getRolesControllerGetGuildRolesQueryKey({ guildId }),
      queryFn: () => rolesControllerGetGuildRoles({ guildId }),
      enabled: !!guildId && hasMentionCandidatesByGuildId[guildId],
      gcTime: Infinity,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const messagesByGuildId = guildIdsToLoad.reduce<
    Record<string, ChatMessageType[]>
  >((result, guildId, index) => {
    result[guildId] = (messageQueries[index]?.data ?? []) as ChatMessageType[];
    return result;
  }, {});
  const membersByGuildId = guildIdsToLoad.reduce<
    Record<string, Record<string, GuildMember>>
  >((result, guildId, index) => {
    result[guildId] = mapGuildMembersByUserId(memberQueries[index]?.data);
    return result;
  }, {});
  const memberSummariesByGuildId = guildIdsToLoad.reduce<
    Record<string, GuildMember[]>
  >((result, guildId, index) => {
    result[guildId] = (memberQueries[index]?.data ?? []) as GuildMember[];
    return result;
  }, {});
  const mentionContextsByGuildId = guildIdsToLoad.reduce<
    Record<string, ChatMentionContext>
  >((result, guildId, index) => {
    const currentMember = currentMemberQueries[index]?.data;

    result[guildId] = {
      memberNames: getChatMentionMemberNames({
        members: memberSummariesByGuildId[guildId],
        messages: messagesByGuildId[guildId],
      }),
      roleNames: getChatMentionRoleNames(roleQueries[index]?.data),
      currentUserNames: getCurrentUserMentionNames({
        currentCharacterNick: Game.hero.nick,
        currentMember,
      }),
      currentUserRoleNames: getCurrentUserMentionRoleNames(currentMember),
    };

    return result;
  }, {});

  const isUserNearBottomRef = useRef(true);
  const scrollPendingRef = useRef(true);
  const prevMessagesLenRef = useRef(0);

  const handleScroll = () => {
    const viewport = scrollAreaRef.current;
    if (!viewport) return;

    const scrollPos = viewport.scrollTop + viewport.clientHeight;
    const scrollHeight = viewport.scrollHeight;

    isUserNearBottomRef.current = scrollHeight - scrollPos < 100;
  };

  useEffect(() => {
    const viewport = scrollAreaRef.current;
    if (!viewport) return;
    viewport.addEventListener("scroll", handleScroll);
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    scrollPendingRef.current = true;
    prevMessagesLenRef.current = 0;
  }, [selectedGuildId, chatFilter]);

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
    const viewport = scrollAreaRef.current;
    if (!viewport) return;

    const msgCount = currentMessages.length;

    if (scrollPendingRef.current) {
      if (hasRenderableMessages) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "instant" });
        scrollPendingRef.current = false;
      }
      prevMessagesLenRef.current = msgCount;
      return;
    }

    if (msgCount > prevMessagesLenRef.current && isUserNearBottomRef.current) {
      viewport.scrollTo({ top: viewport.scrollHeight });
    }

    prevMessagesLenRef.current = msgCount;
  }, [currentMessages, hasRenderableMessages]);

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
              className="ll:h-full ll:w-full ll:box-border ll:border ll:rounded-sm ll:border-gray-400"
            >
              <div
                className="ll:flex ll:flex-col ll:gap-1 ll:p-1 ll:w-full ll:rounded-lg"
                data-ll-draggable="false"
              >
                {currentMessages?.length === 0 ? (
                  <div className="ll:flex ll:items-center ll:justify-center ll:h-full ll:text-gray-500 ll:text-xs">
                    {t("emptyState.noMessages")}
                  </div>
                ) : (
                  currentMessages.map((message) => {
                    const members = membersByGuildId[message.guildId] ?? {};

                    return (
                      <ChatMessage
                        key={message.id}
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

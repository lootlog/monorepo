import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { useChatMessages } from "@/hooks/api/use-chat-messages";
import { useRef, useEffect, useLayoutEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocalStorage } from "react-use";
import { storageKey } from "@/lib/storage-key";
import { useWindowsStore } from "@/store/windows.store";
import { useChatMessagesListener } from "@/features/chat/hooks/use-chat-messages";
import { useGuildMembers } from "@/hooks/api/use-guild-members";
import { GuildSwitcher } from "@/components/guild-switcher";
import { Game } from "@/lib/game";
import { useChatCache } from "./hooks/use-chat-cache";
import { type ChatFilter, useChatStore } from "@/store/chat.store";
import { ChatMessage } from "./components/chat-message";
import { OldChatInput } from "@/features/chat/components/old-chat-input";
import { getGuildNamesById, useGuilds } from "@/hooks/api/use-guilds";
import { ChatWindowActions } from "@/features/chat/components/chat-window-actions";
import { cn } from "@/lib/utils";
import {
  getCurrentChatMessages,
  getNextSelectedGuildId,
  hasVisibleChatMessages,
  syncSelectedGuildChatCache,
} from "./chat.helpers";
import { useTranslation } from "react-i18next";

const chatSelectedGuildKey = (accountId: string, characterId: string) =>
  storageKey(`ll:chat:selected-guild:${accountId}:${characterId}`);

export const Chat = () => {
  const { t } = useTranslation();
  const {
    isIntegratedMode,
    isChatInputEnabled,
    toggleChatInputEnabled,
    chatFilter,
    setChatFilter,
    filtersVisible,
    toggleFiltersVisible,
  } = useChatStore();

  const characterId = String(Game.hero.id);
  const accountId = String(Game.hero.account);
  const open = useWindowsStore((state) => state.chat.open);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const [selectedGuildId, setSelectedGuildId] = useLocalStorage(
    chatSelectedGuildKey(accountId, characterId),
    "",
  );
  const { data: guilds } = useGuilds();

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useChatMessagesListener();

  const messageCache = useChatCache((s) => s.messageCache);
  const memberCache = useChatCache((s) => s.memberCache);

  const { data: messages } = useChatMessages(selectedGuildId);
  const { data: guildMembers } = useGuildMembers(selectedGuildId);

  const isUserNearBottomRef = useRef(true);
  const scrollPendingRef = useRef(true);
  const prevMessagesLenRef = useRef(0);
  const chatFilters: { key: ChatFilter; label: string }[] = [
    { key: "all", label: t("settings.chat.filters.all") },
    { key: "normal", label: t("settings.chat.filters.normal") },
    { key: "npc", label: t("settings.chat.filters.npc") },
    { key: "party", label: t("settings.chat.filters.party") },
  ];

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
  const currentMessages = getCurrentChatMessages(
    messageCache,
    selectedGuildId,
    chatFilter,
  );
  const hasRenderableMessages = hasVisibleChatMessages(
    currentMessages,
    memberCache,
    guildNamesById,
  );

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

  useEffect(() => {
    syncSelectedGuildChatCache({
      selectedGuildId,
      messages,
      guildMembers,
      messageCache,
      memberCache,
      setMessageCache: useChatCache.getState().setMessageCache,
      setMemberCache: useChatCache.getState().setMemberCache,
    });
  }, [selectedGuildId, messages, guildMembers, messageCache, memberCache]);

  if (isIntegratedMode && Game.interface === "ni") {
    return <div />;
  }

  return (
    <AnimatedWindow isOpen={open} windowKey="chat">
      <DraggableWindow
        id="chat"
        title={t("settings.chat.windowTitle")}
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
                    {t("settings.chat.emptyState")}
                  </div>
                ) : (
                  currentMessages.map((message) => {
                    const members = memberCache[message.guildId] ?? {};

                    return (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        all={selectedGuildId === "all"}
                        guildName={guildNamesById[message.guildId]}
                        member={members[message.senderId]}
                      />
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
          {selectedGuildId !== "all" && isChatInputEnabled && (
            <OldChatInput selectedGuildId={selectedGuildId} />
          )}
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};

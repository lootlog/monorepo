import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import {
  type ChatMessage as ChatMessageType,
  useChatMessages,
} from "@/hooks/api/use-chat-messages";
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
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { ChatMessage } from "./components/chat-message";
import { OldChatInput } from "@/features/chat/components/old-chat-input";
import { useGuilds } from "@/hooks/api/use-guilds";
import { ChatWindowActions } from "@/features/chat/components/chat-window-actions";
import { MessageType } from "@/hooks/api/use-send-chat-message";
import { cn } from "@/lib/utils";

const chatSelectedGuildKey = (accountId: string, characterId: string) =>
  storageKey(`ll:chat:selected-guild:${accountId}:${characterId}`);

const CHAT_FILTERS: { key: ChatFilter; label: string }[] = [
  { key: "all", label: "Wszystko" },
  { key: "normal", label: "Czat" },
  { key: "npc", label: "NPC" },
  { key: "party", label: "Grupa" },
];

export const Chat = () => {
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

  const { client } = useAuthenticatedApiClient();
  useChatMessagesListener(client);

  const messageCache = useChatCache((s) => s.messageCache);
  const memberCache = useChatCache((s) => s.memberCache);

  const { data: messages } = useChatMessages(selectedGuildId);
  const { data: guildMembers } = useGuildMembers(selectedGuildId);

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
    if (!selectedGuildId && guilds && guilds.length > 0) {
      setSelectedGuildId(guilds[0].id);
    }
  }, [selectedGuildId, setSelectedGuildId, guilds]);

  const currentMessages = (() => {
    let allMessages;

    if (selectedGuildId === "all") {
      allMessages = Object.values(messageCache)
        .flat()
        .filter((m) => !!m.timestamp);
    } else {
      allMessages = (messageCache[selectedGuildId ?? ""] ?? [])
        .flat()
        .filter((m) => !!m.timestamp);
    }

    const unique: ChatMessageType[] = [];
    for (const msg of allMessages) {
      const ts = new Date(msg.timestamp).getTime();
      const key = `${msg.message?.trim() ?? ""}_${msg.senderId}_${msg.npc?.id ?? ""}`;

      const duplicate = unique.find(
        (u) =>
          `${u.message?.trim() ?? ""}_${u.senderId}_${u.npc?.id ?? ""}` ===
            key && Math.abs(new Date(u.timestamp).getTime() - ts) <= 200,
      );
      if (!duplicate) unique.push(msg);
    }
    const sorted = unique.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    if (chatFilter === "all") return sorted;

    return sorted.filter((msg) => {
      switch (chatFilter) {
        case "normal":
          return (
            msg.type === MessageType.NORMAL ||
            msg.type === MessageType.NOTIFICATION
          );
        case "npc":
          return msg.type === MessageType.NPC;
        case "party":
          return msg.type === MessageType.PARTY_GATHERING;
        default:
          return true;
      }
    });
  })();

  const hasVisibleMessages = currentMessages.some((m) => {
    const members = memberCache[m.guildId] ?? {};
    const member = members[m.senderId];
    const guild = guilds?.find((g) => g.id === m.guildId);
    return m.characterData && member?.name && guild;
  });

  useLayoutEffect(() => {
    const viewport = scrollAreaRef.current;
    if (!viewport) return;

    const msgCount = currentMessages.length;

    if (scrollPendingRef.current) {
      if (hasVisibleMessages) {
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
  }, [currentMessages, hasVisibleMessages]);

  const currentMembers =
    selectedGuildId === "all"
      ? Object.values(memberCache).flat()
      : (memberCache[selectedGuildId ?? ""] ?? []);

  useEffect(() => {
    if (selectedGuildId && selectedGuildId !== "all") {
      if (!messageCache[selectedGuildId] && messages?.length) {
        useChatCache.getState().setMessageCache(selectedGuildId, messages);
      }
      if (!memberCache[selectedGuildId] && guildMembers) {
        useChatCache.getState().setMemberCache(selectedGuildId, guildMembers);
      }
    }
  }, [
    selectedGuildId,
    memberCache,
    messageCache,
    open,
    messages,
    guildMembers,
    currentMessages,
    currentMembers,
  ]);

  if (isIntegratedMode && Game.interface === "ni") {
    return <div />;
  }

  return (
    <AnimatedWindow isOpen={open} windowKey="chat">
      <DraggableWindow
        id="chat"
        title="Chat"
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
              {CHAT_FILTERS.map((filter) => (
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
                    Brak wiadomości
                  </div>
                ) : (
                  currentMessages.map((message) => {
                    const members = memberCache[message.guildId] ?? {};
                    return (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        all={selectedGuildId === "all"}
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

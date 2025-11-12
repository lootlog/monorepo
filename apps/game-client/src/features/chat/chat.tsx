import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { useChatMessages } from "@/hooks/api/use-chat-messages";
import { useRef, useMemo, useEffect } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { useLocalStorage } from "react-use";
import { useWindowsStore } from "@/store/windows.store";
import { useChatMessagesListener } from "@/features/chat/hooks/use-chat-messages";
import { useGuildMembers } from "@/hooks/api/use-guild-members";
import { GuildSwitcher } from "@/components/guild-switcher";
import { Game } from "@/lib/game";
import { useChatCache } from "./hooks/use-chat-cache";
import { ChatMessage } from "./components/chat-message";
import { useChatStore } from "@/store/chat.store";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export const Chat = () => {
  const { isIntegratedMode } = useChatStore();

  const characterId = String(Game.hero.id);
  const accountId = String(Game.hero.account);
  const {
    chat: { open },
    setOpen,
  } = useWindowsStore();
  const [selectedGuildId, setSelectedGuildId] = useLocalStorage(
    `ll:chat:selected-guild:${accountId}:${characterId}`,
    "",
  );

  const scrollAreaRef =
    useRef<React.ElementRef<typeof ScrollArea.Viewport>>(null);

  const selectedGuildIdRef = useRef<string>("");
  selectedGuildIdRef.current = selectedGuildId ?? "";

  const { client } = useAuthenticatedApiClient();
  useChatMessagesListener(client);

  const messageCache = useChatCache((s) => s.messageCache);
  const memberCache = useChatCache((s) => s.memberCache);

  const { data: messages } = useChatMessages(selectedGuildId);
  const { data: guildMembers } = useGuildMembers(selectedGuildId);

  useEffect(() => {
    queueMicrotask(() => {
      scrollAreaRef.current?.scrollTo({
        top: scrollAreaRef.current.scrollHeight + 2000,
        behavior: "instant",
      });
    });
  }, [selectedGuildId]);

  useEffect(() => {
    const unsubscribe = useChatCache.subscribe(
      (state) => state.messageCache,
      (newCache, prevCache) => {
        const selected = selectedGuildIdRef.current;
        for (const channel of Object.keys(newCache)) {
          const newLen = newCache[channel]?.length ?? 0;
          const oldLen = prevCache[channel]?.length ?? 0;
          if (newLen > oldLen) {
            if (selected === channel || selected === "all") {
              queueMicrotask(() => {
                const viewport = scrollAreaRef.current;
                if (!viewport) return;

                const scrollPosition =
                  viewport.scrollTop + viewport.clientHeight;
                const scrollHeight = viewport.scrollHeight;
                if (Math.abs(scrollHeight - scrollPosition) <= 21.25) {
                  requestAnimationFrame(() => {
                    viewport.scrollTo({
                      top: scrollHeight + 2000,
                      behavior: "smooth",
                    });
                  });
                }
              });
            }
            break;
          }
        }
      },
    );

    return () => unsubscribe();
  }, []);

  const currentMessages = useMemo(() => {
    if (selectedGuildId === "all") {
      const allMessages = Object.values(messageCache)
        .flat()
        .filter((m) => !!m.timestamp);
      const uniqueMessagesMap = new Map<string, (typeof allMessages)[0]>();
      for (const msg of allMessages) {
        const date = new Date(msg.timestamp);
        const roundedTs = Math.floor(date.getTime() / 1000);
        const key = `${msg.message}_${msg.senderId}_${roundedTs}`;
        if (!uniqueMessagesMap.has(key)) {
          uniqueMessagesMap.set(key, msg);
        }
      }
      return Array.from(uniqueMessagesMap.values()).sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
      });
    }
    return messageCache[selectedGuildId ?? ""] ?? [];
  }, [selectedGuildId, messageCache]);

  const currentMembers = useMemo(() => {
    if (selectedGuildId === "all") {
      return Object.values(memberCache).flat();
    }
    return memberCache[selectedGuildId ?? ""] ?? [];
  }, [selectedGuildId, memberCache]);

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
      >
        <div className="ll:flex ll:flex-col ll:h-full ll:w-full">
          <div className="ll:shrink-0 ll:pt-1 ll:pb-2">
            <GuildSwitcher
              allowAll={true}
              value={selectedGuildId}
              onChange={setSelectedGuildId}
            />
          </div>
          <div className="ll:flex-1 ll:overflow-hidden">
            <ScrollArea.Root className="ll:h-full ll:w-full ll:box-border ll:border ll:rounded-sm ll:border-gray-400">
              <ScrollArea.Viewport
                ref={scrollAreaRef}
                className="ll:h-full ll:w-full ll:overflow-y-auto"
              >
                <div
                  className="ll:flex ll:flex-col ll:gap-1 ll:p-1 ll:w-full ll:rounded-lg"
                  data-draggable="false"
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
                          member={members[message.senderId]}
                        />
                      );
                    })
                  )}
                </div>
              </ScrollArea.Viewport>

              <ScrollArea.Scrollbar
                orientation="vertical"
                className="ll:flex ll:touch-none ll:select-none ll:bg-black ll:w-2 ll:rounded-full"
              >
                <ScrollArea.Thumb className="ll:flex-1 ll:bg-gray-500 ll:rounded-full" />
              </ScrollArea.Scrollbar>
              <ScrollArea.Corner className="ll:bg-gray-200" />
            </ScrollArea.Root>
          </div>
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};

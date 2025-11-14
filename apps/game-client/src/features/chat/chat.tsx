import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import {
  ChatMessage as ChatMessageType,
  useChatMessages,
} from "@/hooks/api/use-chat-messages";
import { useRef, useMemo, useEffect, useState } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { useLocalStorage } from "react-use";
import { useWindowsStore } from "@/store/windows.store";
import { useChatMessagesListener } from "@/features/chat/hooks/use-chat-messages";
import { useGuildMembers } from "@/hooks/api/use-guild-members";
import { GuildSwitcher } from "@/components/guild-switcher";
import { Game } from "@/lib/game";
import { useChatCache } from "./hooks/use-chat-cache";
import { useChatStore } from "@/store/chat.store";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { ChatMessage } from "./components/chat-message";

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

  const isUserNearBottomRef = useRef(true);
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
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollAreaRef.current?.scrollTo({
          top: scrollAreaRef.current.scrollHeight + 2000,
          behavior: "instant",
        });
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
              if (isUserNearBottomRef.current) {
                const viewport = scrollAreaRef.current;
                if (!viewport) return;

                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    viewport.scrollTo({
                      top: viewport.scrollHeight,
                      behavior: "smooth",
                    });
                  });
                });
              }
            }
            break;
          }
        }
      },
    );

    return () => unsubscribe();
  }, []);

  const currentMessages = useMemo(() => {
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
    return unique.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
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
        minHeight={116}
        minWidth={242}
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
                          all={selectedGuildId === "all"}
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

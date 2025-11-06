import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { useChatMessages } from "@/hooks/api/use-chat-messages";
import { useRef, useLayoutEffect, useMemo } from "react";
import type { Viewport } from "@radix-ui/react-scroll-area";
import { useLocalStorage } from "react-use";
import { useWindowsStore } from "@/store/windows.store";
import { useChatMessagesListener } from "@/features/chat/hooks/use-chat-messages";
import { ChatMessage } from "@/features/chat/components/chat-message";
import { ChatInput } from "@/features/chat/components/chat-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGuildMembers } from "@/hooks/api/use-guild-members";
import { useMemberInvalidation } from "@/hooks/api/use-member-invalidation";
import { GuildSwitcher } from "@/components/guild-switcher";
import { Game } from "@/lib/game";

export const Chat = () => {
  const characterId = String(Game.hero.id);
  const accountId = String(Game.hero.account);
  const {
    chat: { open, autofocus },
    setOpen,
  } = useWindowsStore();
  const [selectedGuildId, setSelectedGuildId] = useLocalStorage(
    `ll:chat:selected-guild:${accountId}:${characterId}`,
    "",
  );
  const { data: messages } = useChatMessages({
    guildId: selectedGuildId ?? "",
  });
  const { data: guildMembers } = useGuildMembers(selectedGuildId);

  const missingSenderIds = useMemo(() => {
    if (!messages || !guildMembers) return [];
    const uniqueSenders = Array.from(new Set(messages.map((m) => m.senderId)));
    return uniqueSenders.filter((senderId) => !guildMembers[senderId]);
  }, [messages, guildMembers]);

  useMemberInvalidation(selectedGuildId, missingSenderIds);

  useChatMessagesListener(selectedGuildId ?? "");

  const scrollAreaRef = useRef<React.ElementRef<typeof Viewport>>(null);
  const selectedGuildIdRef = useRef<string>("");

  selectedGuildIdRef.current = selectedGuildId ?? "";

  useLayoutEffect(() => {
    const scroll = () => {
      scrollAreaRef.current?.scrollTo({
        top: scrollAreaRef.current.scrollHeight + 2000,
        behavior: "instant",
      });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(scroll);
    });
  }, [messages, open]);

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
              value={selectedGuildId}
              onChange={setSelectedGuildId}
            />
          </div>
          <div className="ll:flex-1 ll:overflow-hidden">
            <ScrollArea
              className="ll:h-full ll:w-full ll:box-border ll:border ll:rounded-sm ll:border-gray-400"
              ref={scrollAreaRef}
              type={messages?.length === 0 ? "auto" : "always"}
            >
              <div
                className="ll:flex ll:flex-col ll:gap-1 ll:p-1 ll:w-full ll:rounded-lg"
                data-draggable="false"
              >
                {messages?.length === 0 ? (
                  <div className="ll:flex ll:items-center ll:justify-center ll:h-full ll:text-gray-500 ll:text-xs">
                    Brak wiadomości
                  </div>
                ) : (
                  messages?.map((message) => {
                    const guildMember = guildMembers?.[message.senderId];

                    return (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        member={guildMember}
                      />
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
          <div className="ll:shrink-0 ll:pb-1 ll:mt-2">
            <ChatInput
              selectedGuildId={selectedGuildId}
              autofocus={autofocus}
            />
          </div>
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};

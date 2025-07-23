import { DraggableWindow } from "@/components/draggable-window";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatMessages } from "@/hooks/api/use-chat-messages";
import { useGuildMembers } from "@/hooks/api/use-guild-members";
import { useRef, useLayoutEffect } from "react";
import { Viewport } from "@radix-ui/react-scroll-area";
import { useLocalStorage } from "react-use";
import { useWindowsStore } from "@/store/windows.store";
import { GuildSelector } from "@/components/guild-selector";
import { AnimatePresence, motion } from "framer-motion";
import { useChatMessagesListener } from "@/features/chat/hooks/use-chat-messages";
import { ChatMessage } from "@/features/chat/components/chat-message";
import { ChatInput } from "@/features/chat/components/chat-input";
import { useGlobalStore } from "@/store/global.store";

export const Chat = () => {
  const { accountId, characterId } = useGlobalStore((state) => state.gameState);
  const {
    chat: { open, autofocus },
    setOpen,
  } = useWindowsStore();
  const [selectedGuildId, setSelectedGuildId] = useLocalStorage(
    `ll:chat:selected-guild:${accountId}:${characterId}`,
    ""
  );
  const { data: messages } = useChatMessages({
    guildId: selectedGuildId ?? "",
  });
  const { data: guildMembers } = useGuildMembers(selectedGuildId);
  useChatMessagesListener(selectedGuildId ?? "");

  const scrollAreaRef = useRef<React.ElementRef<typeof Viewport>>(null);
  const selectedGuildIdRef = useRef<string>("");

  selectedGuildIdRef.current = selectedGuildId ?? "";

  useLayoutEffect(() => {
    scrollAreaRef.current?.scrollTo({
      top: scrollAreaRef.current.scrollHeight + 2000,
      behavior: "instant",
    });
  }, [messages, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="chat"
          initial={{ opacity: 0, scaleY: 1.01 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 1.01 }}
          transition={{ duration: 0.1 }}
        >
          <DraggableWindow
            id="chat"
            title="Chat"
            onClose={() => setOpen("chat", false)}
          >
            <div className="ll-flex ll-flex-col ll-h-full ll-w-full">
              <div className="ll-flex-shrink-0 ll-pt-2">
                <GuildSelector
                  selectedGuildId={selectedGuildId}
                  setSelectedGuildId={setSelectedGuildId}
                />
              </div>
              <div className="ll-flex-1 ll-overflow-hidden">
                <ScrollArea
                  className="ll-h-full ll-w-full ll-box-border"
                  ref={scrollAreaRef}
                  type="auto"
                >
                  <div className="ll-flex ll-flex-col ll-gap-1 ll-p-1 ll-w-full  ll-backdrop-blur-xs ll-rounded-lg">
                    {messages?.map((message) => {
                      const guildMember = guildMembers?.[message.senderId];

                      return (
                        <ChatMessage
                          key={message.id}
                          message={message}
                          member={guildMember}
                        />
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
              <div className="ll-flex-shrink-0 ll-pb-1 ll-mt-1">
                <ChatInput
                  selectedGuildId={selectedGuildId}
                  autofocus={autofocus}
                />
              </div>
            </div>
          </DraggableWindow>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

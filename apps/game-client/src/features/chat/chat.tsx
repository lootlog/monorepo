import { DraggableWindow } from "@/components/draggable-window";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChatMessage,
  QUERY_KEY,
  useChatMessages,
} from "@/hooks/api/use-chat-messages";
import { useGuildMembers } from "@/hooks/api/use-guild-members";
import { useSendChatMessage } from "@/hooks/api/use-send-chat-message";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useQueryClient } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { FormEvent, useEffect, useRef, useLayoutEffect } from "react";
import { Viewport } from "@radix-ui/react-scroll-area";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "react-use";
import { useWindowsStore } from "@/store/windows.store";
import { GatewayEvent } from "@/config/gateway";
import { GuildSelector } from "@/components/guild-selector";
import { AnimatePresence, motion } from "framer-motion";
import { decomposeChatMessage } from "@/utils/chat/decompose-chat-message";
import { NPC_NAMES } from "@/constants/margonem";
import { NpcType } from "@/hooks/api/use-npcs";
import { PickedNpcType } from "@/store/npc-detector.store";

const COLOR_BY_NPC_TYPE: Record<PickedNpcType, string> = {
  [NpcType.COLOSSUS]: "rgba(53, 255, 105, 1)", // green
  [NpcType.HERO]: "rgba(220, 247, 99, 1)", // yellow
  [NpcType.ELITE2]: "rgba(219, 90, 186, 1)", // rose
  [NpcType.TITAN]: "rgba(59, 130, 246, 1)", // blue
};

export const Chat = () => {
  const {
    chat: { open },
    setOpen,
  } = useWindowsStore();
  const [selectedGuildId, setSelectedGuildId] = useLocalStorage(
    `chat-selected-guild`,
    ""
  );
  const { data: messages } = useChatMessages({
    guildId: selectedGuildId ?? "",
  });
  const { data: guildMembers } = useGuildMembers(selectedGuildId);
  const { mutate: sendChatMessage } = useSendChatMessage();
  const queryClient = useQueryClient();
  const { socket, connected } = useGateway();
  const scrollAreaRef = useRef<React.ElementRef<typeof Viewport>>(null);
  const selectedGuildIdRef = useRef<string>("");

  selectedGuildIdRef.current = selectedGuildId ?? "";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedGuildId) return;
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const message = formData.get("message") as string;
    if (!message.trim()) return;

    sendChatMessage({ guildIds: [selectedGuildId], message });

    (e.currentTarget as HTMLFormElement).reset();
    return;
  };

  useEffect(() => {
    if (socket?.hasListeners(GatewayEvent.CHAT_MESSAGE) || !connected) return;

    socket?.on(GatewayEvent.CHAT_MESSAGE, (data: ChatMessage) => {
      if (!selectedGuildIdRef.current) return;

      queryClient.setQueryData(
        [QUERY_KEY, selectedGuildIdRef.current],
        (old: AxiosResponse<ChatMessage[]>) => {
          if (data.guildId !== selectedGuildIdRef.current) return old;

          return {
            data: [...old.data, data],
          };
        }
      );
    });
  }, [connected, selectedGuildId]);

  useLayoutEffect(() => {
    scrollAreaRef.current?.scrollTo({
      top: scrollAreaRef.current.scrollHeight + 2000,
      behavior: "instant",
    });
  }, [messages, open]);

  const renderChatMessage = (message: ChatMessage) => {
    const messageData = decomposeChatMessage(message.message);

    if (messageData.npcName && messageData.npcType && messageData.npcLvl) {
      const shortname = NPC_NAMES[messageData.npcType]?.shortname;
      const color = COLOR_BY_NPC_TYPE[messageData.npcType as PickedNpcType];

      return (
        <span style={{ color }}>
          [{shortname}] {messageData.npcName} ({messageData.npcLvl})
        </span>
      );
    }

    return <span>{messageData.baseMessage}</span>;
  };

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
                  <div className="ll-flex ll-flex-col ll-gap-1 ll-p-1 ll-w-full">
                    {messages?.map((message) => {
                      const guildMember = guildMembers?.[message.senderId];
                      const roleWithTopPosition = guildMember?.roles.sort(
                        (a, b) => b.position - a.position
                      );
                      const roleColor = roleWithTopPosition?.[0]?.color;
                      const color =
                        roleColor === 0 ? "FFF" : roleColor?.toString(16);

                      return (
                        <div
                          key={message.id}
                          className="ll-text-white ll-text-xs ll-whitespace-pre-wrap ll-break-words ll-[overflow-wrap:anywhere] ll-w-[calc(100%-1rem)]"
                        >
                          <span className="ll-inline-block ll-whitespace-nowrap">
                            <span className="ll-text-[11px]">
                              [{format(new Date(message.timestamp), "HH:mm")}]
                            </span>{" "}
                            <span
                              className={cn("ll-font-bold ll-mx-1")}
                              style={{ color: `#${color}` }}
                            >
                              {guildMember?.name || "Nieznany"}:
                            </span>
                          </span>{" "}
                          <span className="ll-break-words ll-[overflow-wrap:anywhere]">
                            {renderChatMessage(message)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
              <div className="ll-flex-shrink-0 ll-pt-2 ll-pb-1">
                <form
                  onSubmit={handleSubmit}
                  className="ll-flex ll-items-center ll-justify-center"
                >
                  <Input
                    name="message"
                    autoComplete="off"
                    placeholder="Wiadomość..."
                  />
                </form>
              </div>
            </div>
          </DraggableWindow>
        </motion.div>
      )}
      )
    </AnimatePresence>
  );
};

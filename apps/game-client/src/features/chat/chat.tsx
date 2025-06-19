import { DraggableWindow } from "@/components/draggable-window";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChatMessage,
  QUERY_KEY,
  useChatMessages,
} from "@/hooks/api/use-chat-messages";
import { useGuildMembers } from "@/hooks/api/use-guild-members";
import { useGuilds } from "@/hooks/api/use-guilds";
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
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const message = formData.get("message") as string;
    if (!message.trim()) return;

    sendChatMessage({ guildId: selectedGuildId ?? "", message });

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

  return (
    open && (
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
                        {message.message}
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
    )
  );
};

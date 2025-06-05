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
import { FormEvent, useEffect, useState, useRef, useLayoutEffect } from "react";
import { Viewport } from "@radix-ui/react-scroll-area";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "react-use";
import { useWindowsStore } from "@/store/windows.store";
import { GatewayEvent } from "@/config/gateway";

export const Chat = () => {
  const {
    chat: { open },
    setOpen,
  } = useWindowsStore();
  const [selectedGuildId, setSelectedGuildId] = useLocalStorage(
    `chat-selected-guild`,
    ""
  );
  const { data: guilds } = useGuilds();
  const { data: messages } = useChatMessages({
    guildId: selectedGuildId ?? "",
  });
  const { data: guildMembers } = useGuildMembers(selectedGuildId);
  const { mutate: sendChatMessage } = useSendChatMessage();
  const queryClient = useQueryClient();
  const { socket, connected } = useGateway();
  const scrollAreaRef = useRef<React.ElementRef<typeof Viewport>>(null);
  const selectedGuildIdRef = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (socket.hasListeners(GatewayEvent.CHAT_MESSAGE) || !connected) return;

    socket.on(GatewayEvent.CHAT_MESSAGE, (data: ChatMessage) => {
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
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages, open]);

  return (
    open && (
      <DraggableWindow
        id="chat"
        title="Chat"
        onClose={() => setOpen("chat", false)}
      >
        <div className="ll-pt-2 ll-w-full">
          <Select value={selectedGuildId} onValueChange={setSelectedGuildId}>
            <SelectTrigger className="w-[180px] ll-text-white ll-text-xs ll-border-white ll-rounded-sm ll-h-4 ll-my-1">
              <SelectValue
                placeholder="Wybierz kanał..."
                className="ll-h-4 ll-text-sm ll-text-white"
              />
            </SelectTrigger>
            <SelectContent style={{ zIndex: 99999 }} className="ll-font-sans">
              {guilds?.map((guild) => {
                return (
                  <SelectItem key={guild.id} value={guild.id}>
                    {guild.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <div className="ll-px-1">
            <ScrollArea
              className="ll-flex ll-flex-col ll-gap-1 ll-min-h-40 ll-max-h-48 ll-w-full"
              ref={scrollAreaRef}
            >
              {messages?.map((message) => {
                const guildMember = guildMembers?.[message.senderId];
                const roleWithTopPosition = guildMember?.roles.sort((a, b) => {
                  return b.position - a.position;
                });
                const roleColor = roleWithTopPosition?.[0]?.color;
                const color = roleColor === 0 ? "FFF" : roleColor?.toString(16);

                return (
                  <div
                    key={message.id}
                    className="ll-text-white ll-text-xs ll-w-56 ll-break-words ll-inline-block ll-whitespace-pre-line ll-mt-0.5"
                  >
                    <span className="ll-text-[11px] ll-inline-block">
                      [{format(new Date(message.timestamp), "HH:mm")}]{" "}
                    </span>
                    <span
                      className={cn("ll-font-bold ll-mx-1 ll-inline-block")}
                      style={{ color: `#${color}` }}
                    >
                      {guildMember?.name || "Nieznany"}:
                    </span>
                    {message.message}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </ScrollArea>
          </div>
          <form
            onSubmit={handleSubmit}
            className="ll-pt-2 ll-pl-0 ll-flex ll-items-center ll-justify-center"
          >
            <Input
              className="!ll-w-full ll-bg-transparent ll-text-white !ll-text-[12px] ll-border-white ll-rounded-sm !ll-h-6 !ll-px-1 ll-box-border"
              name="message"
              autoComplete="off"
              placeholder="Wiadomość..."
            />
          </form>
        </div>
      </DraggableWindow>
    )
  );
};

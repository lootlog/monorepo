import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { useWindowsStore } from "@/store/windows.store";
import { Game } from "@/lib/game";
import {
  MessageType,
  useSendChatMessage,
} from "@/hooks/api/use-send-chat-message";
import { useCreateNotification } from "@/hooks/api/use-create-notification";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ChatInputActions } from "./components/chat-input-actions";
import { useChatStore } from "@/store/chat.store";
import { GuildMultiSelector } from "@/components/guild-multi-selector";

const FormSchema = z.object({
  message: z.string().min(1).max(120),
});
type FormData = z.infer<typeof FormSchema>;

export const ChatInput = () => {
  const {
    isNotificationEnabled,
    toggleNotificationEnabled,
    selectedInputGuildIds,
    setSelectedInputGuildIds,
  } = useChatStore();

  const characterId = String(Game.hero.id);
  const world = Game.getWorldName();

  const {
    "chat-input": { open, autofocus },
    setOpen,
  } = useWindowsStore();
  const { mutate: sendChatMessage } = useSendChatMessage();
  const { mutate: createNotification } = useCreateNotification();

  const { watch, setValue, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      message: "",
    },
  });

  const messageValue = watch("message");

  const onSubmit = (data: FormData) => {
    if (!characterId || !world || selectedInputGuildIds.length <= 0) return; //TODO send character data

    if (isNotificationEnabled) {
      createNotification({
        guildIds: selectedInputGuildIds,
        message: data.message,
        world,
      });
      sendChatMessage({
        guildIds: selectedInputGuildIds,
        message: data.message,
        type: MessageType.NOTIFICATION,
        characterData: {
          nick: Game.hero.nick,
          id: Game.hero.id,
          acc: Game.hero.account,
          lvl: Game.hero.lvl,
          prof: Game.hero.prof,
          icon: Game.hero.icon,
        },
      });
    } else {
      sendChatMessage({
        guildIds: selectedInputGuildIds,
        message: data.message,
        type: MessageType.NORMAL,
        characterData: {
          nick: Game.hero.nick,
          id: Game.hero.id,
          acc: Game.hero.account,
          lvl: Game.hero.lvl,
          prof: Game.hero.prof,
          icon: Game.hero.icon,
        },
      });
    }

    setValue("message", "");
  };

  return (
    <AnimatedWindow isOpen={open} windowKey="chat-input">
      <DraggableWindow
        id="chat-input"
        title="Napisz wiadomość"
        onClose={() => setOpen("chat-input", false)}
        minHeight={116}
        minWidth={242}
        actions=<ChatInputActions
          notificationEnabled={isNotificationEnabled}
          toggleNotificationEnabled={toggleNotificationEnabled}
        />
      >
        <div className="ll:flex ll:flex-col ll:h-full ll:w-full">
          <div className="ll:shrink-0 ll:pt-1 ll:pb-1">
            <GuildMultiSelector
              value={selectedInputGuildIds}
              onChange={setSelectedInputGuildIds}
            />
          </div>
          <div className="ll:flex ll:flex-col ll:flex-1 ll:pb-1 ll:mt-1">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="ll:flex ll:flex-1"
            >
              <textarea
                spellCheck={false}
                data-slot="input"
                onMouseDown={(evt) => evt.stopPropagation()}
                autoCorrect="off"
                autoCapitalize="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Wiadomość..."
                autoFocus={autofocus}
                value={messageValue}
                onChange={(e) => setValue("message", e.target.value)}
                className="ll:h-full ll:w-full ll:overflow-hidden ll:resize-none ll:outline-none ll:rounded-sm ll:border ll:border-gray-400 ll:bg-transparent ll:px-1 ll:py-1 ll:text-xs ll:text-white ll:placeholder:text-muted-foreground ll:box-border ll:transition-[color,box-shadow] ll:disabled:pointer-events-none ll:disabled:opacity-50"
              />
            </form>
          </div>
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};

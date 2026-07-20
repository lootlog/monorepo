import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { useWindowsStore } from "@/store/windows.store";
import { MessageType } from "@/api/chat.api";
import { Game } from "@/lib/game";
import { useSendChatMessage } from "@/hooks/api/use-send-chat-message";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CommandActions } from "./components/command-actions";
import {
  CommandSuggestions,
  useCommandSuggestions,
} from "./components/command-suggestions";
import { useChatStore } from "@/store/chat.store";
import { GuildMultiSelector } from "@/components/guild-multi-selector";
import { usePartyCommand } from "./hooks/use-party-command";
import { useTranslation } from "react-i18next";
import { useNotificationChatOrchestration } from "@/features/chat/hooks/use-notification-chat-orchestration";
import { useShallow } from "zustand/react/shallow";

const FormSchema = z.object({
  message: z.string().min(1).max(120),
});
type FormData = z.infer<typeof FormSchema>;

export const CommandWindow = () => {
  const { t } = useTranslation("command");
  const { selectedInputGuildIds, setSelectedInputGuildIds } = useChatStore(
    useShallow((state) => ({
      selectedInputGuildIds: state.selectedInputGuildIds,
      setSelectedInputGuildIds: state.setSelectedInputGuildIds,
    })),
  );

  const characterId = String(Game.hero.id);
  const world = Game.getWorldName();

  const open = useWindowsStore((state) => state.command.open);
  const autofocus = useWindowsStore((state) => state.command.autofocus);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { mutateAsync: sendChatMessageAsync } = useSendChatMessage();
  const { startNotificationMessage } = useNotificationChatOrchestration();
  const { handlePartyCommand } = usePartyCommand();

  const { watch, setValue, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      message: "",
    },
  });

  const messageValue = watch("message");

  const suggestions = useCommandSuggestions({
    inputValue: messageValue,
    onSelect: (prefix) => setValue("message", prefix),
  });

  const onSubmit = async (data: FormData) => {
    if (!characterId || !world || selectedInputGuildIds.length <= 0) return;

    if (data.message.startsWith("/grp")) {
      const description = data.message.slice("/grp".length).trim() || undefined;
      await handlePartyCommand(description, selectedInputGuildIds);
      setValue("message", "");
      setOpen("command", false);
      return;
    }

    const isNotification = data.message.startsWith("!");
    const message = isNotification ? data.message.slice(1) : data.message;

    if (isNotification) {
      try {
        await startNotificationMessage({
          guildIds: selectedInputGuildIds,
          world,
          message,
          sendChatMessage: (resolvedGuildIds) =>
            sendChatMessageAsync({
              guildIds: resolvedGuildIds,
              message,
              type: MessageType.NOTIFICATION,
              characterData: {
                nick: Game.hero.nick,
                id: Game.hero.id,
                acc: Game.hero.account,
                lvl: Game.hero.lvl,
                prof: Game.hero.prof,
                icon: Game.hero.img,
              },
            }),
        });
      } catch {
        return;
      }
    } else {
      try {
        await sendChatMessageAsync({
          guildIds: selectedInputGuildIds,
          message: data.message,
          type: MessageType.NORMAL,
          characterData: {
            nick: Game.hero.nick,
            id: Game.hero.id,
            acc: Game.hero.account,
            lvl: Game.hero.lvl,
            prof: Game.hero.prof,
            icon: Game.hero.img,
          },
        });
      } catch {
        return;
      }
    }

    setValue("message", "");
    setOpen("command", false);
  };

  return (
    <AnimatedWindow isOpen={open} windowKey="command">
      <DraggableWindow
        id="command"
        title={t("window.title")}
        onClose={() => setOpen("command", false)}
        minHeight={116}
        minWidth={242}
        actions=<CommandActions />
        contentClassName="ll:overflow-visible"
      >
        <div className="ll:flex ll:flex-col ll:h-full ll:w-full">
          <div className="ll:shrink-0 ll:pt-1 ll:pb-1">
            <GuildMultiSelector
              value={selectedInputGuildIds}
              onChange={setSelectedInputGuildIds}
            />
          </div>
          <div className="ll:flex ll:flex-col ll:flex-1 ll:pb-1 ll:mt-1">
            <div className="ll:relative ll:flex ll:flex-1">
              <CommandSuggestions
                onSelect={(prefix) => setValue("message", prefix)}
                filtered={suggestions.filtered}
                isOpen={suggestions.isOpen}
                selectedIndex={suggestions.selectedIndex}
              />
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
                    if (suggestions.handleKeyDown(e)) return;
                    if (e.key === "Escape") {
                      setValue("message", "");
                      setOpen("command", false);
                      return;
                    }
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder={t("input.placeholder")}
                  autoFocus={autofocus}
                  value={messageValue}
                  onChange={(e) => setValue("message", e.target.value)}
                  className="ll:h-full ll:w-full ll:overflow-hidden ll:resize-none ll:outline-none ll:rounded-sm ll:border ll:border-gray-400 ll:bg-transparent ll:px-1 ll:py-1 ll:text-xs ll:text-white ll:placeholder:text-muted-foreground ll:box-border ll:transition-[color,box-shadow] ll:disabled:pointer-events-none ll:disabled:opacity-50"
                />
              </form>
            </div>
          </div>
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};

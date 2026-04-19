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
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { CommandActions } from "./components/command-actions";
import { CommandContextPanel } from "./components/command-context-panel";
import {
  CommandSuggestions,
  useCommandSuggestions,
} from "./components/command-suggestions";
import { getCommandState } from "./command-state";
import { useChatStore } from "@/store/chat.store";
import { GuildMultiSelector } from "@/components/guild-multi-selector";
import { usePartyCommand } from "./hooks/use-party-command";

const FormSchema = z.object({
  message: z.string().min(1).max(120),
});
type FormData = z.infer<typeof FormSchema>;

export const CommandWindow = () => {
  const { t } = useTranslation();
  const { selectedInputGuildIds, setSelectedInputGuildIds } = useChatStore();

  const characterId = String(Game.hero.id);
  const world = Game.getWorldName();

  const open = useWindowsStore((state) => state.command.open);
  const autofocus = useWindowsStore((state) => state.command.autofocus);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { mutate: sendChatMessage } = useSendChatMessage();
  const { mutate: createNotification } = useCreateNotification();
  const { handlePartyCommand } = usePartyCommand();

  const { watch, setValue, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      message: "",
    },
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messageValue = watch("message");
  const commandState = getCommandState(messageValue, {
    selectedGuildCount: selectedInputGuildIds.length,
  });

  const suggestions = useCommandSuggestions({
    inputValue: messageValue,
    onSelect: (prefix) => {
      setValue("message", prefix);
      textareaRef.current?.focus();
    },
  });

  const onSubmit = (data: FormData) => {
    const submissionState = getCommandState(data.message, {
      selectedGuildCount: selectedInputGuildIds.length,
    });

    if (
      !characterId ||
      !world ||
      !submissionState.canSubmit ||
      selectedInputGuildIds.length <= 0
    ) {
      return;
    }

    if (submissionState.isPartyCommand) {
      const description = submissionState.submissionMessage || undefined;
      handlePartyCommand(description, selectedInputGuildIds);
      setValue("message", "");
      setOpen("command", false);
      return;
    }

    if (submissionState.isNotification) {
      createNotification({
        guildIds: selectedInputGuildIds,
        message: submissionState.submissionMessage,
        world,
      });
      sendChatMessage({
        guildIds: selectedInputGuildIds,
        message: submissionState.submissionMessage,
        type: MessageType.NOTIFICATION,
        characterData: {
          nick: Game.hero.nick,
          id: Game.hero.id,
          acc: Game.hero.account,
          lvl: Game.hero.lvl,
          prof: Game.hero.prof,
          icon: Game.hero.img,
        },
      });
    } else {
      sendChatMessage({
        guildIds: selectedInputGuildIds,
        message: submissionState.submissionMessage,
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
    }

    setValue("message", "");
    setOpen("command", false);
  };

  return (
    <AnimatedWindow isOpen={open} windowKey="command">
      <DraggableWindow
        id="command"
        title={t("settings.windows.command")}
        onClose={() => setOpen("command", false)}
        minHeight={168}
        minWidth={280}
        actions=<CommandActions />
        contentClassName="ll:overflow-visible"
      >
        <div className="ll:flex ll:h-full ll:w-full ll:flex-col ll:gap-2 ll:pb-1">
          <div className="ll:shrink-0 ll:pt-1">
            <GuildMultiSelector
              value={selectedInputGuildIds}
              onChange={setSelectedInputGuildIds}
            />
          </div>
          <CommandContextPanel
            commandState={commandState}
            selectedGuildIds={selectedInputGuildIds}
          />
          <div className="ll:flex ll:min-h-0 ll:flex-1 ll:flex-col">
            <div
              className={cn(
                "ll:flex ll:min-h-0 ll:flex-1 ll:flex-col ll:rounded-sm ll:border ll:bg-gray-950/90 ll:p-1 ll:shadow-[0_10px_24px_rgba(0,0,0,0.24)]",
                commandState.mode === "notification" &&
                  "ll:border-amber-400/60 ll:shadow-[0_10px_24px_rgba(245,158,11,0.14)]",
                commandState.mode === "party" &&
                  "ll:border-emerald-400/60 ll:shadow-[0_10px_24px_rgba(16,185,129,0.14)]",
                commandState.mode === "normal" && "ll:border-gray-600/80",
              )}
            >
              <div className="ll:flex ll:items-center ll:justify-between ll:gap-2 ll:px-1 ll:pb-1">
                <span className="ll:text-[10px] ll:font-medium ll:text-gray-300">
                  {t(
                    `settings.command.modes.${commandState.mode}.composerLabel`,
                  )}
                </span>
                <span
                  className={cn(
                    "ll:text-[10px] ll:tabular-nums",
                    commandState.exceedsMaxLength
                      ? "ll:text-red-300"
                      : "ll:text-gray-500",
                  )}
                >
                  {t("settings.command.characterCount", {
                    count: commandState.messageLength,
                    max: 120,
                  })}
                </span>
              </div>
              <div className="ll:relative ll:flex ll:min-h-0 ll:flex-1">
                <CommandSuggestions
                  onSelect={(prefix) => {
                    setValue("message", prefix);
                    textareaRef.current?.focus();
                  }}
                  filtered={suggestions.filtered}
                  isOpen={commandState.showSuggestions}
                  selectedIndex={suggestions.selectedIndex}
                />
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="ll:flex ll:min-h-0 ll:flex-1"
                >
                  <textarea
                    ref={textareaRef}
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
                        if (!commandState.canSubmit) {
                          e.preventDefault();
                          return;
                        }
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder={t(
                      `settings.command.modes.${commandState.mode}.placeholder`,
                    )}
                    autoFocus={autofocus}
                    value={messageValue}
                    onChange={(e) => setValue("message", e.target.value)}
                    className="ll:h-full ll:min-h-16 ll:w-full ll:overflow-hidden ll:resize-none ll:rounded-sm ll:border-none ll:bg-transparent ll:px-1 ll:py-1 ll:text-xs ll:leading-4 ll:text-white ll:outline-none ll:placeholder:text-gray-500 ll:box-border ll:transition-[color,box-shadow] ll:disabled:pointer-events-none ll:disabled:opacity-50"
                  />
                </form>
              </div>
              <div className="ll:flex ll:flex-wrap ll:items-center ll:justify-between ll:gap-x-3 ll:gap-y-1 ll:border-t ll:border-white/8 ll:px-1 ll:pt-1">
                <span
                  className={cn(
                    "ll:text-[10px]",
                    commandState.canSubmit
                      ? "ll:text-gray-400"
                      : "ll:text-red-200",
                  )}
                >
                  {t(
                    commandState.hasRecipients
                      ? commandState.hasContent
                        ? "settings.command.hints.submitReady"
                        : `settings.command.modes.${commandState.mode}.emptyHint`
                      : "settings.command.hints.selectGuild",
                  )}
                </span>
                <span className="ll:text-[10px] ll:text-gray-500">
                  {t("settings.command.hints.keyboard")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};

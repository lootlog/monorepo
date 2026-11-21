import { useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { ChecklistMenu } from "@/components/checklist-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Kbd } from "@/components/ui/kbd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CHAT_COMMAND_PREFIXES } from "@/features/chat/chat-command-prefix";
import { useChatStore } from "@/store/chat.store";
import {
  getCommandMode,
  toggleCommandMode,
  type CommandMode,
} from "@/features/command/command-mode.helpers";
import { ChatComposeModeIcon } from "./chat-compose-mode-icon";
import type { useChatInputController } from "./use-chat-input-controller";

const MODES = ["message", "notification", "party"] as const;

type ChatComposeModeMenuProps = {
  controller: ReturnType<typeof useChatInputController>;
  /** Where the list opens; the side facing away from the screen edge. */
  side: "top" | "bottom";
  iconClassName?: string;
  className?: string;
};

// Margonem handles every document key press whose target is not a text field
// (Enter opens its chat, letters move the hero), so keys stay in the menu.
// Escape on the trigger still reaches the Quick chat console, which closes.
const keepKeyInTrigger = (event: KeyboardEvent<HTMLElement>) => {
  if (event.key !== "Escape") event.stopPropagation();
};

/**
 * The composer's mode icon: it shows what Enter does, and pressing it lists
 * the modes with the prefix that switches to each while typing. Picking one
 * rewrites the prefix, keeps the typed text and returns to the field; a
 * picked message or notification also becomes the mode later entries start in.
 */
export const ChatComposeModeMenu = ({
  controller,
  side,
  iconClassName,
  className,
}: ChatComposeModeMenuProps) => {
  const { t } = useTranslation("chat");
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const {
    messageValue,
    replaceMessage,
    focusEditorCaret,
    caretIndex,
    isPending,
    selectedGuildId,
  } = controller;

  const mode = getCommandMode(messageValue);

  const defaultMode = useChatStore((state) => state.defaultComposeMode);

  const closeToEditor = () => {
    setOpen(false);
    focusEditorCaret(caretIndex);
  };

  const selectMode = (nextMode: CommandMode) => {
    if (nextMode !== "party") {
      useChatStore.getState().setDefaultComposeMode(nextMode);
    }

    if (nextMode === mode) {
      closeToEditor();

      return;
    }

    setOpen(false);
    replaceMessage(toggleCommandMode(messageValue, nextMode));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <IconButton
          label={t("input.modes.trigger", {
            mode: t(`input.modes.${mode}`),
          })}
          disabled={isPending || !selectedGuildId}
          className={className}
          onKeyDown={keepKeyInTrigger}
          onKeyUp={keepKeyInTrigger}
        >
          <ChatComposeModeIcon mode={mode} className={iconClassName} />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent
        ref={popupRef}
        side={side}
        align="start"
        className="ll-action-menu ll:w-max ll:min-w-48 ll:overflow-hidden ll:p-0"
        initialFocus={() =>
          popupRef.current?.querySelector<HTMLElement>(
            'button[aria-pressed="true"]',
          ) ?? true
        }
        // Selecting a mode or Escape puts the caret back in the field; an
        // outside press leaves focus where the player pressed.
        finalFocus={false}
        // Stopping the keys also hides Escape from the popover's document
        // listener, and from the Quick chat console, which stays open.
        onKeyDown={(event) => {
          event.stopPropagation();

          if (event.key === "Escape") {
            event.preventDefault();
            closeToEditor();
          }
        }}
        onKeyUp={(event) => event.stopPropagation()}
      >
        <ChecklistMenu
          aria-label={t("input.modes.label")}
          items={MODES.map((item) => ({
            value: item,
            label: t(`input.modes.${item}`),
            leading: (
              <ChatComposeModeIcon mode={item} className="ll:size-3.5" />
            ),
            trailing:
              item === defaultMode || item !== "message" ? (
                <>
                  {item === defaultMode ? (
                    <span className="ll:text-[10px] ll:text-muted-foreground">
                      {t("input.modes.default")}
                    </span>
                  ) : null}
                  {item === "message" ? null : (
                    <Kbd className="ll:h-4 ll:min-w-4 ll:text-[10px]">
                      {CHAT_COMMAND_PREFIXES[item].trim()}
                    </Kbd>
                  )}
                </>
              ) : undefined,
          }))}
          selected={new Set([mode])}
          onToggle={selectMode}
        />
      </PopoverContent>
    </Popover>
  );
};

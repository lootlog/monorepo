import { ScrollArea } from "@/components/ui/scroll-area";
import type { CommandSuggestion } from "@/features/command/command-suggestions.helpers";
import {
  getChatMentionSuggestionDisplayLabel,
  type ChatMentionSuggestion,
} from "@/features/chat/chat-mention-suggestions.helpers";
import { cn } from "cn";
import { useEffect, useRef, type FC } from "react";
import { useTranslation } from "react-i18next";
import { CornerDownLeft, Loader2 } from "lucide-react";
import { useDelayedVisibility } from "@/hooks/ui/use-delayed-visibility";

export type ChatInputSuggestion =
  | ({
      type: "mention";
    } & ChatMentionSuggestion)
  | ({
      type: "command";
    } & CommandSuggestion);

type ChatMentionSuggestionsProps = {
  suggestionMode: "mention" | "command" | null;
  suggestions: ChatInputSuggestion[];
  isOpen: boolean;
  showNoResults: boolean;
  selectedIndex: number;
  onSelect: (suggestion: ChatInputSuggestion) => void;
  isLoading?: boolean;
};

export const ChatMentionSuggestions: FC<ChatMentionSuggestionsProps> = ({
  suggestionMode,
  suggestions,
  isOpen,
  showNoResults,
  selectedIndex,
  onSelect,
  isLoading = false,
}) => {
  const { t } = useTranslation("chat");
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const showLoading = useDelayedVisibility(isLoading);

  useEffect(() => {
    if (!isOpen || selectedIndex < 0) {
      return;
    }

    optionRefs.current[selectedIndex]?.scrollIntoView({
      behavior: "instant",
      block: "nearest",
    });
  }, [isOpen, selectedIndex, suggestions]);

  if (!isOpen && !showNoResults && !isLoading) {
    return null;
  }

  if (isLoading && !showLoading) {
    return null;
  }

  const title = t(
    suggestionMode === "command"
      ? "input.commandSuggestions.title"
      : "input.mentionSuggestions.title",
  );

  return (
    <div className="ll:absolute ll:bottom-full ll:inset-x-0 ll:z-50 ll:w-full ll:overflow-hidden ll:border-t ll:border-x-0 ll:border-b-0 ll:border-gray-400/40 ll:bg-[#171719]">
      <div className="ll:flex ll:items-center ll:justify-between ll:border-x-0 ll:border-t-0 ll:border-b ll:border-gray-400/20 ll:px-2 ll:py-1 ll:text-[10px] ll:text-neutral-400">
        <span>{title}</span>
        <span>{suggestions.length}</span>
      </div>
      {isLoading ? (
        <div
          className="ll:flex ll:items-center ll:justify-center ll:gap-2 ll:p-2 ll:text-[11px] ll:text-neutral-300"
          role="status"
        >
          <Loader2
            aria-hidden
            className="ll:size-3.5 ll:animate-spin ll:motion-reduce:animate-none"
          />
          {t("input.mentionSuggestions.loading")}
        </div>
      ) : showNoResults ? (
        <p className="ll:m-0 ll:p-3 ll:text-center ll:text-[11px] ll:text-neutral-400">
          {t(
            suggestionMode === "command"
              ? "input.commandSuggestions.noResults"
              : "input.mentionSuggestions.noResults",
          )}
        </p>
      ) : (
        <ScrollArea className="ll:max-h-[125px] ll:w-full">
          <div role="listbox" aria-label={title}>
            {suggestions.map((suggestion, index) => {
              const command = suggestion.type === "command";

              const label = command
                ? suggestion.label
                : getChatMentionSuggestionDisplayLabel(suggestion);

              return (
                <button
                  key={
                    command
                      ? `command:${suggestion.prefix}`
                      : `${suggestion.kind}:${suggestion.normalizedLabel}`
                  }
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="option"
                  aria-label={command ? undefined : label}
                  aria-selected={index === selectedIndex}
                  className={cn(
                    "ll:flex ll:w-full ll:appearance-none ll:items-center ll:gap-2 ll:rounded-none ll:border-0 ll:px-2 ll:py-[5px] ll:text-left ll:focus-visible:outline-2 ll:focus-visible:outline-neutral-400 ll:focus-visible:-outline-offset-2",
                    index === selectedIndex
                      ? "ll:bg-[#303034]"
                      : "ll:bg-transparent ll:hover:bg-[#262629]",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSelect(suggestion)}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "ll:flex ll:size-[22px] ll:shrink-0 ll:items-center ll:justify-center ll:text-[10px] ll:text-neutral-300",
                      !command && "ll:rounded-full ll:bg-[#353539]",
                    )}
                  >
                    {command
                      ? "/"
                      : suggestion.kind === "role"
                        ? "@"
                        : suggestion.label.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="ll:min-w-0 ll:flex-1">
                    <span
                      className="ll:block ll:truncate ll:text-[12px] ll:leading-[15px] ll:font-semibold ll:text-white"
                      style={
                        !command && suggestion.color
                          ? { color: `#${suggestion.color}` }
                          : undefined
                      }
                    >
                      {label}
                    </span>
                    {command && (
                      <span className="ll:block ll:truncate ll:text-[10px] ll:leading-[14px] ll:text-neutral-400">
                        {suggestion.description}
                      </span>
                    )}
                  </span>
                  <CornerDownLeft
                    aria-hidden
                    size={12}
                    className={cn(
                      "ll:shrink-0 ll:text-neutral-400",
                      index !== selectedIndex && "ll:invisible",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
      <div className="ll:border-x-0 ll:border-b-0 ll:border-t ll:border-gray-400/20 ll:px-2 ll:py-1 ll:text-[9px] ll:text-neutral-400">
        {t("input.suggestionKeyboardHint")}
      </div>
    </div>
  );
};

import { ScrollArea } from "@/components/ui/scroll-area";
import type { CommandSuggestion } from "@/features/command/command-suggestions.helpers";
import {
  getChatMentionSuggestionDisplayLabel,
  type ChatMentionSuggestion,
} from "@/features/chat/chat-mention-suggestions.helpers";
import { cn } from "cn";
import { useEffect, useRef, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
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
      behavior: "smooth",
      block: "nearest",
    });
  }, [isOpen, selectedIndex, suggestions]);

  if (!isOpen && !showNoResults && !isLoading) {
    return null;
  }

  if (isLoading && !showLoading) {
    return null;
  }

  return (
    <div className="ll:absolute ll:bottom-full ll:left-1 ll:right-1 ll:z-50 ll:mb-1 ll:overflow-hidden ll:rounded-sm ll:border ll:border-gray-500 ll:bg-black/96 ll:shadow-[0_8px_24px_rgba(0,0,0,0.55)]">
      {isLoading ? (
        <div
          className="ll:flex ll:items-center ll:justify-center ll:gap-2 ll:px-3 ll:py-2 ll:text-xs ll:text-gray-300"
          role="status"
        >
          <Loader2
            aria-hidden
            className="ll:size-3.5 ll:animate-spin ll:motion-reduce:animate-none"
          />
          {t("input.mentionSuggestions.loading")}
        </div>
      ) : showNoResults ? (
        <p className="ll:px-3 ll:py-2 ll:text-center ll:text-xs ll:text-gray-400">
          {suggestionMode === "command"
            ? t("input.commandSuggestions.noResults")
            : t("input.mentionSuggestions.noResults")}
        </p>
      ) : (
        <ScrollArea className="ll:max-h-44 ll:w-full">
          <div role="listbox" className="ll:py-1">
            {suggestions.map((suggestion, index) => {
              if (suggestion.type === "command") {
                return (
                  <button
                    key={`command:${suggestion.prefix}`}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    type="button"
                    role="option"
                    aria-selected={index === selectedIndex}
                    className={cn(
                      "ll:flex ll:w-full ll:appearance-none ll:flex-col ll:gap-0.5 ll:border-0 ll:bg-transparent ll:px-2 ll:py-1.5 ll:text-left ll:outline-none ll:transition-colors",
                      index === selectedIndex
                        ? "ll:bg-slate-700/70"
                        : "ll:hover:bg-slate-800/60",
                    )}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => onSelect(suggestion)}
                  >
                    <span className="ll:text-xs ll:font-medium ll:text-white">
                      {suggestion.label}
                    </span>
                    <span className="ll:text-[10px] ll:text-gray-400">
                      {suggestion.description}
                    </span>
                  </button>
                );
              }

              const previousSuggestion = suggestions[index - 1];
              const showHeading =
                !previousSuggestion ||
                previousSuggestion.type !== "mention" ||
                previousSuggestion.kind !== suggestion.kind;
              const heading =
                suggestion.kind === "role"
                  ? t("input.mentionSuggestions.roles")
                  : t("input.mentionSuggestions.members");

              return (
                <div
                  key={`${suggestion.kind}:${suggestion.normalizedLabel}`}
                  className="ll:flex ll:flex-col"
                >
                  {showHeading ? (
                    <div className="ll:px-2 ll:pt-1.5 ll:pb-1 ll:text-[10px] ll:font-semibold ll:uppercase ll:tracking-[0.08em] ll:text-gray-400">
                      {heading}
                    </div>
                  ) : null}
                  <button
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    type="button"
                    role="option"
                    aria-selected={index === selectedIndex}
                    className={cn(
                      "ll:flex ll:w-full ll:appearance-none ll:items-center ll:gap-2 ll:border-0 ll:bg-transparent ll:px-2 ll:py-1.5 ll:text-left ll:text-xs ll:text-white ll:outline-none ll:transition-colors",
                      index === selectedIndex
                        ? "ll:bg-slate-700/70"
                        : "ll:hover:bg-slate-800/60",
                    )}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => onSelect(suggestion)}
                  >
                    <span
                      className="ll:h-1.5 ll:w-1.5 ll:shrink-0 ll:rounded-full ll:bg-current"
                      style={
                        suggestion.color
                          ? {
                              color: `#${suggestion.color}`,
                            }
                          : {
                              color: "#9CA3AF",
                            }
                      }
                    />
                    <span
                      className="ll:truncate ll:font-medium ll:text-white"
                      style={
                        suggestion.color
                          ? {
                              color: `#${suggestion.color}`,
                            }
                          : undefined
                      }
                    >
                      {getChatMentionSuggestionDisplayLabel(suggestion)}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

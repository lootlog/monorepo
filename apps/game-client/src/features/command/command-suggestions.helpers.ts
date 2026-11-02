import type { TFunction } from "i18next";
import { getChatCommandPrefix } from "@/features/chat/chat-command-prefix";

export type CommandSuggestion = {
  prefix: string;
  label: string;
  description: string;
};

type GetCommandSuggestionsOptions = {
  includeClearChatCommand?: boolean;
};

const MAX_COMMAND_SUGGESTION_INPUT_LENGTH = 4;

export const getCommandSuggestions = (
  t: TFunction<"command">,
  options?: GetCommandSuggestionsOptions,
): CommandSuggestion[] => {
  const suggestions: CommandSuggestion[] = [
    {
      prefix: "/grp",
      label: t("suggestions.partySearchLabel"),
      description: t("suggestions.partySearchDescription"),
    },
  ];

  if (options?.includeClearChatCommand) {
    suggestions.push({
      prefix: "/clr",
      label: t("suggestions.clearChatLabel"),
      description: t("suggestions.clearChatDescription"),
    });
  }

  return suggestions;
};

/** A completed `/grp` is already hidden as the mode, so it suggests nothing. */
export const isCommandSuggestionsInput = (inputValue: string) => {
  return (
    inputValue.startsWith("/") &&
    inputValue.length <= MAX_COMMAND_SUGGESTION_INPUT_LENGTH &&
    !getChatCommandPrefix(inputValue)
  );
};

export const filterCommandSuggestions = ({
  inputValue,
  suggestions,
}: {
  inputValue: string;
  suggestions: CommandSuggestion[];
}) =>
  suggestions
    .filter((suggestion) => suggestion.prefix.startsWith(inputValue))
    .toSorted((left, right) => left.prefix.localeCompare(right.prefix));

export const getCommandSuggestionInsertValue = (
  suggestion: CommandSuggestion,
) => {
  return `${suggestion.prefix} `;
};

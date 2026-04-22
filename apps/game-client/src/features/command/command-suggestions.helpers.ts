import type { TFunction } from "i18next";

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

export const isCommandSuggestionsInput = (inputValue: string) => {
  return (
    inputValue.startsWith("/") &&
    inputValue.length <= MAX_COMMAND_SUGGESTION_INPUT_LENGTH
  );
};

export const filterCommandSuggestions = ({
  inputValue,
  suggestions,
}: {
  inputValue: string;
  suggestions: CommandSuggestion[];
}) => {
  const sortableSuggestions = Array.isArray(suggestions) ? suggestions : [];

  return sortableSuggestions
    .filter((suggestion) => suggestion.prefix.startsWith(inputValue))
    .toSorted((left, right) => {
      const leftIsExactMatch = left.prefix === inputValue;
      const rightIsExactMatch = right.prefix === inputValue;

      if (leftIsExactMatch !== rightIsExactMatch) {
        return leftIsExactMatch ? -1 : 1;
      }

      return left.prefix.localeCompare(right.prefix);
    });
};

export const getCommandSuggestionInsertValue = (
  suggestion: CommandSuggestion,
) => {
  return `${suggestion.prefix} `;
};

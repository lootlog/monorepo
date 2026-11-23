import type {
  ActiveChatMention,
  ChatMentionSuggestion,
} from "@/features/chat/chat-mention-suggestions.helpers";
import type { ChatInputSuggestion } from "@/features/chat/components/chat-mention-suggestions";
import {
  isCommandSuggestionsInput,
  type CommandSuggestion,
} from "@/features/command/command-suggestions.helpers";

export type TabCompletionSession = {
  insertedLabel: string;
  mention: ActiveChatMention;
};

export const getActiveMentionForSuggestions = ({
  activeMention,
  caretIndex,
  messageValue,
  tabCompletionSession,
}: {
  activeMention: ActiveChatMention | null;
  caretIndex: number;
  messageValue: string;
  tabCompletionSession: TabCompletionSession | null;
}) => {
  if (activeMention) {
    return activeMention;
  }

  if (!tabCompletionSession) {
    return null;
  }

  const { insertedLabel, mention } = tabCompletionSession;

  const isSessionActive =
    caretIndex === mention.end + 1 &&
    /\s/.test(messageValue[mention.end] ?? "") &&
    messageValue.slice(mention.start, mention.end) === insertedLabel;

  return isSessionActive ? mention : null;
};

export const resolveSuggestionKeys = (
  messageValue: string,
  activeMention: ActiveChatMention | null,
  dismissedSuggestionKey: string | null,
) => {
  const activeMentionKey = activeMention
    ? [activeMention.start, activeMention.end, activeMention.query].join(":")
    : null;

  const commandKey = isCommandSuggestionsInput(messageValue)
    ? `command:${messageValue}`
    : null;

  const isCommandInput = commandKey !== null;
  const activeSuggestionKey = isCommandInput ? commandKey : activeMentionKey;

  return {
    activeSuggestionKey,
    areSuggestionsDismissed:
      activeSuggestionKey !== null &&
      dismissedSuggestionKey === activeSuggestionKey,
    isCommandInput,
  };
};

export const resolveSuggestionPresentation = ({
  activeMention,
  areSuggestionsDismissed,
  filteredCommandSuggestions,
  isCommandInput,
  isFetchingMemberNames,
  isFetchingRoleNames,
  mentionSuggestions,
}: {
  activeMention: ActiveChatMention | null;
  areSuggestionsDismissed: boolean;
  filteredCommandSuggestions: CommandSuggestion[];
  isCommandInput: boolean;
  isFetchingMemberNames: boolean;
  isFetchingRoleNames: boolean;
  mentionSuggestions: ChatMentionSuggestion[];
}) => {
  const isCommandSuggestionsOpen =
    isCommandInput &&
    filteredCommandSuggestions.length > 0 &&
    !areSuggestionsDismissed;

  const isMentionSuggestionsOpen =
    !isCommandInput && activeMention !== null && !areSuggestionsDismissed;

  let suggestionMode: "command" | "mention" | null = null;

  let activeSuggestions: ChatInputSuggestion[] = mentionSuggestions.map(
    (suggestion) => ({ ...suggestion, type: "mention" as const }),
  );

  if (isCommandSuggestionsOpen) {
    suggestionMode = "command";
    activeSuggestions = filteredCommandSuggestions.map((suggestion) => ({
      ...suggestion,
      type: "command" as const,
    }));
  } else if (isMentionSuggestionsOpen) {
    suggestionMode = "mention";
  }

  return {
    activeSuggestions,
    isMentionSuggestionsOpen,
    showMentionSuggestionNoResults:
      isMentionSuggestionsOpen &&
      !isFetchingMemberNames &&
      !isFetchingRoleNames &&
      mentionSuggestions.length === 0,
    suggestionMode,
  };
};

export function resolveSelectedSuggestionIndex(
  count: number,
  requested: number,
) {
  if (count === 0) return -1;

  return requested >= 0 && requested < count ? requested : 0;
}

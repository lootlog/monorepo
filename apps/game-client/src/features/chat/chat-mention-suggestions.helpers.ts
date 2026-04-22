import {
  getDiscordColorHex,
  isChatMentionBoundary,
  normalizeChatMentionName,
} from "./chat-mentions.helpers";
import type {
  MemberSummaryResponseDtoOutput,
  RoleResponseDtoOutput,
} from "@/lib/api/generated/main/model";

export type ActiveChatMention = {
  start: number;
  end: number;
  query: string;
};

export type ChatMentionSuggestion = {
  kind: "role" | "member";
  label: string;
  normalizedLabel: string;
  color: string | null;
};

type ChatMentionSuggestionEntry = Omit<ChatMentionSuggestion, "kind">;
const MAX_SUGGESTIONS_PER_KIND = 5;

const sortMentionSuggestionEntries = ({
  entries,
  query,
}: {
  entries: ChatMentionSuggestionEntry[];
  query: string;
}) => {
  const normalizedQuery = normalizeChatMentionName(query);
  const sortableEntries = Array.isArray(entries) ? entries : [];

  return sortableEntries.toSorted((left, right) => {
    if (!normalizedQuery) {
      return left.label.localeCompare(right.label);
    }

    const leftStartsWithQuery =
      left.normalizedLabel.startsWith(normalizedQuery);
    const rightStartsWithQuery =
      right.normalizedLabel.startsWith(normalizedQuery);

    if (leftStartsWithQuery !== rightStartsWithQuery) {
      return leftStartsWithQuery ? -1 : 1;
    }

    return left.label.localeCompare(right.label);
  });
};

const getMentionSuggestionEntries = <T>({
  values,
  getLabel,
  getColor,
}: {
  values: readonly T[];
  getLabel: (value: T) => string;
  getColor: (value: T) => string | null;
}) => {
  const entriesByNormalizedLabel = new Map<
    string,
    ChatMentionSuggestionEntry
  >();
  const iterableValues = Array.isArray(values) ? values : [];

  iterableValues.forEach((value) => {
    const label = getLabel(value);
    const normalizedLabel = normalizeChatMentionName(label);

    if (!normalizedLabel || entriesByNormalizedLabel.has(normalizedLabel)) {
      return;
    }

    entriesByNormalizedLabel.set(normalizedLabel, {
      label,
      normalizedLabel,
      color: getColor(value),
    });
  });

  return [...entriesByNormalizedLabel.values()];
};

export const getChatMentionMemberSuggestions = (
  members?: MemberSummaryResponseDtoOutput[],
): ChatMentionSuggestionEntry[] => {
  return getMentionSuggestionEntries({
    values: members ?? [],
    getLabel: (member) => member.name,
    getColor: (member) => getDiscordColorHex(member.color),
  });
};

export const getChatMentionRoleSuggestions = (
  roles?: RoleResponseDtoOutput[],
): ChatMentionSuggestionEntry[] => {
  return getMentionSuggestionEntries({
    values: roles ?? [],
    getLabel: (role) => role.name,
    getColor: (role) => getDiscordColorHex(role.color),
  });
};

const getMentionTokenEnd = (message: string, caretIndex: number) => {
  let index = caretIndex;

  while (index < message.length && !isChatMentionBoundary(message[index])) {
    index += 1;
  }

  return index;
};

export const getActiveChatMention = ({
  message,
  caretIndex,
}: {
  message: string;
  caretIndex?: number | null;
}) => {
  if (caretIndex === undefined || caretIndex === null) {
    return null;
  }

  const safeCaretIndex = Math.max(0, Math.min(caretIndex, message.length));
  let mentionStart = safeCaretIndex - 1;

  while (mentionStart >= 0) {
    const character = message[mentionStart];

    if (character === "@") {
      break;
    }

    if (isChatMentionBoundary(character)) {
      return null;
    }

    mentionStart -= 1;
  }

  if (mentionStart < 0 || message[mentionStart] !== "@") {
    return null;
  }

  if (mentionStart > 0 && !isChatMentionBoundary(message[mentionStart - 1])) {
    return null;
  }

  return {
    start: mentionStart,
    end: getMentionTokenEnd(message, safeCaretIndex),
    query: message.slice(mentionStart + 1, safeCaretIndex),
  } satisfies ActiveChatMention;
};

export const getChatMentionSuggestions = ({
  memberSuggestions,
  roleSuggestions,
  query,
}: {
  memberSuggestions?: ChatMentionSuggestionEntry[];
  roleSuggestions?: ChatMentionSuggestionEntry[];
  query: string;
}) => {
  const normalizedQuery = normalizeChatMentionName(query);
  const seenLabels = new Set<string>();
  const suggestions: ChatMentionSuggestion[] = [];

  const appendSuggestions = (
    entries: ChatMentionSuggestionEntry[],
    kind: ChatMentionSuggestion["kind"],
  ) => {
    let appendedSuggestions = 0;
    const sortedEntries = sortMentionSuggestionEntries({ entries, query });

    sortedEntries.forEach((entry) => {
      if (appendedSuggestions >= MAX_SUGGESTIONS_PER_KIND) {
        return;
      }

      const normalizedLabel = entry.normalizedLabel;

      if (seenLabels.has(normalizedLabel)) {
        return;
      }

      if (normalizedQuery && !normalizedLabel.includes(normalizedQuery)) {
        return;
      }

      seenLabels.add(normalizedLabel);
      suggestions.push({
        kind,
        label: entry.label,
        normalizedLabel,
        color: entry.color,
      });
      appendedSuggestions += 1;
    });
  };

  appendSuggestions(roleSuggestions ?? [], "role");
  appendSuggestions(memberSuggestions ?? [], "member");

  return suggestions;
};

export const getChatMentionSuggestionDisplayLabel = (
  suggestion: Pick<ChatMentionSuggestion, "label">,
) => {
  return suggestion.label.startsWith("@")
    ? suggestion.label
    : `@${suggestion.label}`;
};

export const applyChatMentionSuggestion = ({
  message,
  mention,
  suggestion,
}: {
  message: string;
  mention: ActiveChatMention;
  suggestion: ChatMentionSuggestion;
}) => {
  const trailingCharacter = message[mention.end];
  const hasTrailingWhitespace = /\s/.test(trailingCharacter ?? "");
  const displayLabel = getChatMentionSuggestionDisplayLabel(suggestion);
  const insertText = hasTrailingWhitespace ? displayLabel : `${displayLabel} `;
  const nextMessage = `${message.slice(0, mention.start)}${insertText}${message.slice(mention.end)}`;
  const nextCaretIndex =
    mention.start + insertText.length + (hasTrailingWhitespace ? 1 : 0);

  return {
    nextMessage,
    nextCaretIndex,
  };
};

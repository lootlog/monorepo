export type ChatCommandPrefixKind = "notification" | "party";

/** Colour keys (`getTextColor`) shared with notification messages and gathering alerts. */
export const CHAT_COMMAND_COLOR_KEYS = {
  notification: "message",
  party: "party-gathering",
} satisfies Record<ChatCommandPrefixKind, string>;

export type ChatCommandPrefix = {
  kind: ChatCommandPrefixKind;
  /** The prefix as typed, including the space that ends `/grp`. */
  text: string;
  /** Whether anything follows the prefix yet. */
  hasArgument: boolean;
};

const PARTY_PREFIX = /^\/grp(?: |$)/u;

/**
 * The command prefix the composer draws as a chip. It matches what
 * `getChatSubmitAction` sends, limited to a complete `/grp` word so a
 * half-typed or longer word stays plain text.
 */
export const getChatCommandPrefix = (
  message: string,
): ChatCommandPrefix | null => {
  const party = PARTY_PREFIX.exec(message);

  if (party) {
    return {
      kind: "party",
      text: party[0],
      hasArgument: message.length > party[0].length,
    };
  }

  if (message.startsWith("!")) {
    return {
      kind: "notification",
      text: "!",
      hasArgument: message.length > 1,
    };
  }

  return null;
};

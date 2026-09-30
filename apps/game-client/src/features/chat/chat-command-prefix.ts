export type ChatCommandMode = "notification" | "party";

/** What the composer shows in place of a hidden prefix while nothing follows it. */
export type ChatCommandHints = Record<ChatCommandMode, string>;

/** Colour keys (`getTextColor`) shared with notification messages and gathering alerts. */
export const CHAT_COMMAND_COLOR_KEYS = {
  notification: "message",
  party: "party-gathering",
} satisfies Record<ChatCommandMode, string>;

/** The prefixes the mode buttons write in front of the typed text. */
export const CHAT_COMMAND_PREFIXES = {
  notification: "!",
  party: "/grp ",
} satisfies Record<ChatCommandMode, string>;

export type ChatCommandPrefix = {
  mode: ChatCommandMode;
  /** The prefix as it starts the entry. */
  text: string;
};

// `/grp` switches as soon as it is typed, as `getChatSubmitAction` reads it;
// the space that usually follows belongs to the prefix, not the description.
const PARTY_PREFIX = /^\/grp ?/u;

/**
 * The prefix the composer hides; its icon, text colour and placeholder show
 * the mode instead.
 */
export const getChatCommandPrefix = (
  message: string,
): ChatCommandPrefix | null => {
  if (message.startsWith(CHAT_COMMAND_PREFIXES.notification)) {
    return { mode: "notification", text: CHAT_COMMAND_PREFIXES.notification };
  }

  const party = PARTY_PREFIX.exec(message);

  return party ? { mode: "party", text: party[0] } : null;
};

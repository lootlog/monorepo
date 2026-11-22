import type { ChatDefaultComposeMode } from "@/store/chat.store";

export type ChatCommandMode = "notification" | "party";

export type ChatCommandHints = Record<ChatCommandMode, string>;

export const CHAT_COMMAND_COLOR_KEYS = {
  notification: "message",
  party: "party-gathering",
} satisfies Record<ChatCommandMode, string>;

export const CHAT_COMMAND_PREFIXES = {
  notification: "!",
  party: "/grp ",
} satisfies Record<ChatCommandMode, string>;

export const getDefaultComposeDraft = (mode: ChatDefaultComposeMode) =>
  mode === "notification" ? CHAT_COMMAND_PREFIXES.notification : "";

export const leaveNotificationForCommand = (
  previousMessage: string,
  nextMessage: string,
) =>
  previousMessage === CHAT_COMMAND_PREFIXES.notification &&
  nextMessage.startsWith(`${CHAT_COMMAND_PREFIXES.notification}/`)
    ? nextMessage.slice(CHAT_COMMAND_PREFIXES.notification.length)
    : nextMessage;

export type ChatCommandPrefix = {
  mode: ChatCommandMode;
  text: string;
};

const PARTY_PREFIX = /^\/grp ?/u;

export const getChatCommandPrefix = (
  message: string,
): ChatCommandPrefix | null => {
  if (message.startsWith(CHAT_COMMAND_PREFIXES.notification)) {
    return { mode: "notification", text: CHAT_COMMAND_PREFIXES.notification };
  }

  const party = PARTY_PREFIX.exec(message);

  return party ? { mode: "party", text: party[0] } : null;
};

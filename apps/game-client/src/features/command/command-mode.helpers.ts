import { getChatSubmitAction } from "@/features/chat/chat-submit.helpers";

export type CommandMode = "message" | "notification" | "party";

const MODE_PREFIXES = {
  message: "",
  notification: "!",
  party: "/grp ",
} satisfies Record<CommandMode, string>;

/** What Enter does with this text; the typed prefix decides, as in the chat. */
export const getCommandMode = (messageValue: string): CommandMode => {
  const { kind } = getChatSubmitAction({ canClearChat: false, messageValue });

  return kind === "clear" ? "message" : kind;
};

/**
 * Rewrites the prefix so Enter performs `mode`, keeping what the player typed
 * after it. A mode button that is already on switches back to a message.
 */
export const toggleCommandMode = (messageValue: string, mode: CommandMode) => {
  const currentMode = getCommandMode(messageValue);

  const body =
    currentMode === "party"
      ? messageValue.slice("/grp".length).trimStart()
      : messageValue.slice(MODE_PREFIXES[currentMode].length);

  const nextMode = currentMode === mode ? "message" : mode;

  return `${MODE_PREFIXES[nextMode]}${body}`;
};

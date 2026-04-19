export const PARTY_COMMAND_PREFIX = "!grp";
export const NOTIFICATION_COMMAND_PREFIX = "!";
const MAX_MESSAGE_LENGTH = 120;

export type CommandMode = "normal" | "notification" | "party";

type CommandStateOptions = {
  selectedGuildCount?: number;
};

export type CommandState = {
  mode: CommandMode;
  isNotification: boolean;
  isPartyCommand: boolean;
  isCommand: boolean;
  messageLength: number;
  exceedsMaxLength: boolean;
  canSubmit: boolean;
  hasRecipients: boolean;
  hasContent: boolean;
  commandQuery: string;
  showSuggestions: boolean;
  submissionMessage: string;
};

export const getCommandState = (
  inputValue: string,
  options?: CommandStateOptions,
): CommandState => {
  const hasRecipients = (options?.selectedGuildCount ?? 0) > 0;
  const isPartyCommand = inputValue.startsWith(PARTY_COMMAND_PREFIX);
  const isNotification = inputValue.startsWith(NOTIFICATION_COMMAND_PREFIX);
  const isCommand = isNotification;
  const mode: CommandMode = isPartyCommand
    ? "party"
    : isNotification
      ? "notification"
      : "normal";

  const commandQuery = isCommand ? (inputValue.split(/\s/, 1)[0] ?? "") : "";
  const showSuggestions =
    commandQuery.startsWith(NOTIFICATION_COMMAND_PREFIX) &&
    !/\s/.test(inputValue);

  const commandPayload = isPartyCommand
    ? inputValue.slice(PARTY_COMMAND_PREFIX.length).trim()
    : isNotification
      ? inputValue.slice(NOTIFICATION_COMMAND_PREFIX.length).trim()
      : inputValue;

  const hasContent = isCommand
    ? commandPayload.length > 0
    : inputValue.trim().length > 0;
  const exceedsMaxLength = inputValue.length > MAX_MESSAGE_LENGTH;

  return {
    mode,
    isNotification,
    isPartyCommand,
    isCommand,
    messageLength: inputValue.length,
    exceedsMaxLength,
    canSubmit: hasRecipients && hasContent && !exceedsMaxLength,
    hasRecipients,
    hasContent,
    commandQuery,
    showSuggestions,
    submissionMessage: commandPayload,
  };
};

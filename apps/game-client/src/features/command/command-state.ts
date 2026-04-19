export const PARTY_COMMAND_PREFIX = "!grp";
export const NOTIFICATION_COMMAND_PREFIX = "!";
const MAX_MESSAGE_LENGTH = 120;

const hasCommandBoundary = (inputValue: string, prefix: string) => {
  if (!inputValue.startsWith(prefix)) {
    return false;
  }

  const nextCharacter = inputValue.charAt(prefix.length);
  return nextCharacter === "" || /\s/.test(nextCharacter);
};

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
  const isPartyCommand = hasCommandBoundary(inputValue, PARTY_COMMAND_PREFIX);
  const isNotification = inputValue.startsWith(NOTIFICATION_COMMAND_PREFIX);
  const isCommand = isNotification;
  let mode: CommandMode = "normal";
  let commandQuery = "";
  let showSuggestions = false;
  let commandPayload = inputValue;

  if (isPartyCommand) {
    mode = "party";
    commandQuery = PARTY_COMMAND_PREFIX;
    commandPayload = inputValue.slice(PARTY_COMMAND_PREFIX.length).trim();
    showSuggestions = !/\s/.test(inputValue);
  } else if (isNotification) {
    mode = "notification";
    commandQuery = inputValue.split(/\s/, 1)[0] ?? "";
    commandPayload = inputValue
      .slice(NOTIFICATION_COMMAND_PREFIX.length)
      .trim();
    showSuggestions = !/\s/.test(inputValue);
  }

  let hasContent = inputValue.trim().length > 0;
  if (isPartyCommand) {
    hasContent = true;
  } else if (isNotification) {
    hasContent = commandPayload.length > 0;
  }

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

import { Permission } from "@lootlog/types";
import { Label } from "@/components/ui/label";
import type { MessageType } from "@/api/chat.api";
import { Popover, PopoverContent } from "@/components/ui/popover";
import {
  applyChatMentionSuggestion,
  getActiveChatMention,
  getChatMentionMemberSuggestions,
  getChatMentionSuggestionDisplayLabel,
  getChatMentionRoleSuggestions,
  getChatMentionSuggestions,
  type ActiveChatMention,
  type ChatMentionSuggestion,
} from "@/features/chat/chat-mention-suggestions.helpers";
import {
  buildChatMentionContext,
  hasChatMentionToken,
} from "@/features/chat/chat-mentions.helpers";
import { ChatInputEditor } from "@/features/chat/components/chat-input-editor";
import { ChatReplyPreview } from "@/features/chat/components/chat-reply-preview";
import {
  ChatMentionSuggestions,
  type ChatInputSuggestion,
} from "@/features/chat/components/chat-mention-suggestions";
import { upsertChatMessage } from "@/features/chat/chat.helpers";
import { CHAT_QUERY_GC_TIME_MS } from "@/features/chat/chat.constants";
import { useNotificationChatOrchestration } from "@/features/chat/hooks/use-notification-chat-orchestration";
import {
  filterCommandSuggestions,
  getCommandSuggestionInsertValue,
  getCommandSuggestions,
  isCommandSuggestionsInput,
  type CommandSuggestion,
} from "@/features/command/command-suggestions.helpers";
import { usePartyCommand } from "@/features/command/hooks/use-party-command";
import { useGuildMembersSummary } from "@/hooks/api/guild-members-summary-query";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  useGuildsControllerGetGuildPermissions,
} from "@lootlog/api-client/react-query/main/guilds";
import {
  useChatControllerClearChatMessages,
  useChatControllerSendChatMessage,
} from "@lootlog/api-client/react-query/main/chat";
import {
  getMembersControllerGetMeQueryKey,
  useMembersControllerGetMe,
} from "@lootlog/api-client/react-query/main/members";
import type { ChatMessageResponseDtoOutput } from "@lootlog/api-client/models/main/chat-message-response-dto-output";
import {
  getRolesControllerGetGuildRolesQueryKey,
  useRolesControllerGetGuildRoles,
} from "@lootlog/api-client/react-query/main/roles";
import { buildChatCharacterData } from "@/lib/api/generated-helpers";
import { useGameStore } from "@/store/game.store";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chat.store";
import { useQueryClient } from "@tanstack/react-query";
import { updateChatMessagesCache } from "@/features/chat/chat-query-cache.helpers";
import {
  getChatMessageTypeForSubmitAction,
  getChatReplyPayload,
  getChatSubmitAction,
} from "@/features/chat/chat-submit.helpers";
import {
  useEffect,
  useRef,
  useState,
  type FC,
  type KeyboardEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ChatReadyRoomIndicator } from "@/features/chat/components/chat-ready-room-indicator";

type ChatInputProps = {
  selectedGuildId?: string;
  autofocus?: boolean;
  onMessageSent?: () => void;
};

type TabCompletionSession = {
  insertedLabel: string;
  mention: ActiveChatMention;
};

const REQUIRED_CLEAR_CHAT_PERMISSIONS = [Permission.OWNER, Permission.ADMIN];

const CHAT_INPUT_SHELL_CLASS =
  "ll:h-6 ll:w-full ll:min-w-0 ll:overflow-hidden ll:rounded-sm ll:border ll:border-solid ll:border-gray-400 ll:bg-black/92 ll:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ll:transition-[color,box-shadow]";

const CHAT_INPUT_FOCUS_CLASS =
  "ll:focus-within:border-ring ll:focus-within:ring-ring/50 ll:focus-within:ring-[3px]";

export const ChatInput: FC<ChatInputProps> = ({
  selectedGuildId,
  autofocus,
  onMessageSent,
}) => {
  const { t } = useTranslation("chat");
  const { t: tCommand } = useTranslation("command");
  const queryClient = useQueryClient();
  const replyDraft = useChatStore((state) => state.replyDraft);
  const clearReplyDraft = useChatStore((state) => state.clearReplyDraft);
  const editorRef = useRef<HTMLDivElement>(null);
  const clearConfirmAnchorRef = useRef<HTMLDivElement>(null);
  const world = useGameStore((state) => state.game?.world ?? "unknown");
  const currentCharacterNick = useGameStore(
    (state) => state.game?.hero.name ?? "",
  );
  const { mutateAsync: sendChatMessage, isPending: isSendingMessage } =
    useChatControllerSendChatMessage();
  const { mutateAsync: clearChatMessages, isPending: isClearingChat } =
    useChatControllerClearChatMessages();
  const { isCreatingNotificationMessage, startNotificationMessage } =
    useNotificationChatOrchestration();
  const { handlePartyCommand } = usePartyCommand();
  const [messageValue, setMessageValue] = useState("");
  const [caretIndex, setCaretIndex] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(-1);
  const [dismissedMentionKey, setDismissedMentionKey] = useState<string | null>(
    null,
  );
  const [tabCompletionSession, setTabCompletionSession] =
    useState<TabCompletionSession | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const pendingFocusCaretRef = useRef<number | null>(null);
  const isPending =
    isSendingMessage || isCreatingNotificationMessage || isClearingChat;
  const activeMention = getActiveChatMention({
    message: messageValue,
    caretIndex,
  });
  const isTabCompletionSessionActive =
    tabCompletionSession !== null &&
    caretIndex === tabCompletionSession.mention.end + 1 &&
    /\s/.test(messageValue[tabCompletionSession.mention.end] ?? "") &&
    messageValue.slice(
      tabCompletionSession.mention.start,
      tabCompletionSession.mention.end,
    ) === tabCompletionSession.insertedLabel;
  const activeMentionForSuggestions =
    activeMention ??
    (isTabCompletionSessionActive ? tabCompletionSession.mention : null);
  const activeMentionSuggestionKey = activeMentionForSuggestions
    ? [
        activeMentionForSuggestions.start,
        activeMentionForSuggestions.end,
        activeMentionForSuggestions.query,
      ].join(":")
    : null;
  const commandSuggestionKey = isCommandSuggestionsInput(messageValue)
    ? `command:${messageValue}`
    : null;
  const hasMentionInput = hasChatMentionToken(messageValue);
  const isCommandInput = commandSuggestionKey !== null;
  const activeSuggestionKey = isCommandInput
    ? commandSuggestionKey
    : activeMentionSuggestionKey;
  const areSuggestionsDismissed =
    activeSuggestionKey !== null && dismissedMentionKey === activeSuggestionKey;
  const shouldLoadMentionData =
    Boolean(selectedGuildId) && hasMentionInput && !isCommandInput;
  const { data: guildPermissions = [] } =
    useGuildsControllerGetGuildPermissions(
      { guildId: selectedGuildId ?? "" },
      {
        query: {
          queryKey: getGuildsControllerGetGuildPermissionsQueryKey({
            guildId: selectedGuildId ?? "",
          }),
          enabled: Boolean(selectedGuildId),
          staleTime: 5 * 60 * 1000,
        },
      },
    );
  const { data: guildMembers = [], isFetching: isFetchingMemberNames } =
    useGuildMembersSummary(
      { guildId: selectedGuildId ?? "" },
      {
        query: {
          enabled: shouldLoadMentionData,
        },
      },
    );
  const { data: guildRoles = [], isFetching: isFetchingRoleNames } =
    useRolesControllerGetGuildRoles(
      { guildId: selectedGuildId ?? "" },
      {
        query: {
          queryKey: getRolesControllerGetGuildRolesQueryKey({
            guildId: selectedGuildId ?? "",
          }),
          enabled: shouldLoadMentionData,
          gcTime: CHAT_QUERY_GC_TIME_MS,
          staleTime: 5 * 60 * 1000,
        },
      },
    );
  const { data: currentMember } = useMembersControllerGetMe(
    { guildId: selectedGuildId ?? "" },
    {
      query: {
        queryKey: getMembersControllerGetMeQueryKey({
          guildId: selectedGuildId ?? "",
        }),
        enabled: shouldLoadMentionData,
        gcTime: CHAT_QUERY_GC_TIME_MS,
        staleTime: 5 * 60 * 1000,
      },
    },
  );
  const memberSuggestions = getChatMentionMemberSuggestions(guildMembers);
  const roleSuggestions = getChatMentionRoleSuggestions(guildRoles);
  const canClearChat = REQUIRED_CLEAR_CHAT_PERMISSIONS.some((permission) =>
    guildPermissions.includes(permission),
  );
  const commandSuggestions = getCommandSuggestions(tCommand, {
    includeClearChatCommand: canClearChat,
  });
  const filteredCommandSuggestions = filterCommandSuggestions({
    inputValue: messageValue,
    suggestions: commandSuggestions,
  });
  const mentionSuggestions = getChatMentionSuggestions({
    memberSuggestions,
    roleSuggestions,
    query: activeMentionForSuggestions?.query ?? "",
  });
  const mentionContext = buildChatMentionContext({
    currentCharacterNick,
    currentMember,
    members: guildMembers,
    roles: guildRoles,
  });
  const isCommandSuggestionsOpen =
    isCommandInput &&
    filteredCommandSuggestions.length > 0 &&
    !areSuggestionsDismissed;
  const isMentionSuggestionsOpen =
    !isCommandInput &&
    activeMentionForSuggestions !== null &&
    !areSuggestionsDismissed;
  const suggestionMode = isCommandSuggestionsOpen
    ? "command"
    : isMentionSuggestionsOpen
      ? "mention"
      : null;
  const activeSuggestions: ChatInputSuggestion[] = isCommandSuggestionsOpen
    ? filteredCommandSuggestions.map((suggestion) => ({
        ...suggestion,
        type: "command" as const,
      }))
    : mentionSuggestions.map((suggestion) => ({
        ...suggestion,
        type: "mention" as const,
      }));
  const showMentionSuggestionNoResults =
    isMentionSuggestionsOpen &&
    !isFetchingMemberNames &&
    !isFetchingRoleNames &&
    mentionSuggestions.length === 0;
  const isClearChatCommand = messageValue.trim() === "/clr";

  useEffect(() => {
    if (
      !replyDraft ||
      !selectedGuildId ||
      replyDraft.guildId === selectedGuildId
    ) {
      return;
    }

    clearReplyDraft();
  }, [clearReplyDraft, replyDraft, selectedGuildId]);

  useEffect(() => {
    if (!isClearChatCommand) {
      setIsClearConfirmOpen(false);
    }
  }, [isClearChatCommand]);

  useEffect(() => {
    if (suggestionMode === null || activeSuggestions.length === 0) {
      setSelectedMentionIndex(-1);
      return;
    }

    setSelectedMentionIndex((currentIndex) => {
      if (currentIndex < 0 || currentIndex >= activeSuggestions.length) {
        return 0;
      }

      return currentIndex;
    });
  }, [activeSuggestionKey, activeSuggestions.length, suggestionMode]);

  const focusEditorCaret = (nextCaretIndex: number) => {
    pendingFocusCaretRef.current = nextCaretIndex;

    requestAnimationFrame(() => {
      if (isPending) {
        return;
      }

      editorRef.current?.focus();
      setCaretIndex(nextCaretIndex);
      pendingFocusCaretRef.current = null;
    });
  };

  useEffect(() => {
    if (isPending || pendingFocusCaretRef.current === null) {
      return;
    }

    const nextCaretIndex = pendingFocusCaretRef.current;

    requestAnimationFrame(() => {
      if (pendingFocusCaretRef.current !== nextCaretIndex) {
        return;
      }

      editorRef.current?.focus();
      setCaretIndex(nextCaretIndex);
      pendingFocusCaretRef.current = null;
    });
  }, [isPending]);

  const handleMentionSuggestionSelect = ({
    keepTabCompletionSession = false,
    mention,
    suggestion,
  }: {
    keepTabCompletionSession?: boolean;
    mention: ActiveChatMention | null;
    suggestion: ChatMentionSuggestion;
  }) => {
    if (!mention) {
      return;
    }

    const { nextMessage, nextCaretIndex } = applyChatMentionSuggestion({
      message: messageValue,
      mention,
      suggestion,
    });
    const insertedLabel = getChatMentionSuggestionDisplayLabel(suggestion);

    applySelectedMessageValue({
      nextTabCompletionSession: keepTabCompletionSession
        ? {
            insertedLabel,
            mention: {
              ...mention,
              end: mention.start + insertedLabel.length,
            },
          }
        : null,
      nextCaretIndex,
      nextMessage,
    });
  };

  const handleCommandSuggestionSelect = (suggestion: CommandSuggestion) => {
    const nextMessage = getCommandSuggestionInsertValue(suggestion);
    const nextCaretIndex = nextMessage.length;

    applySelectedMessageValue({
      nextCaretIndex,
      nextMessage,
    });
  };

  const applySelectedMessageValue = ({
    nextCaretIndex,
    nextMessage,
    nextTabCompletionSession = null,
  }: {
    nextCaretIndex: number;
    nextMessage: string;
    nextTabCompletionSession?: TabCompletionSession | null;
  }) => {
    setMessageValue(nextMessage);
    setCaretIndex(nextCaretIndex);
    setDismissedMentionKey(null);
    setTabCompletionSession(nextTabCompletionSession);
    focusEditorCaret(nextCaretIndex);
  };

  const buildChatMessagePayload = ({
    message,
    type,
    characterData,
  }: {
    message: string;
    type: typeof MessageType.NORMAL | typeof MessageType.NOTIFICATION;
    characterData: NonNullable<ReturnType<typeof buildChatCharacterData>>;
  }) => {
    return {
      message,
      type,
      characterData,
      replyTo: getChatReplyPayload(replyDraft),
    };
  };

  const handleSuggestionSelect = (suggestion: ChatInputSuggestion) => {
    if (suggestion.type === "command") {
      handleCommandSuggestionSelect(suggestion);
      return;
    }

    handleMentionSuggestionSelect({
      mention: activeMentionForSuggestions,
      suggestion,
    });
  };

  const resetInputState = () => {
    setMessageValue("");
    setCaretIndex(0);
    setDismissedMentionKey(null);
    setTabCompletionSession(null);
    clearReplyDraft();
    setIsClearConfirmOpen(false);
  };

  const handleClearChatConfirm = async () => {
    if (!selectedGuildId) {
      return;
    }

    try {
      await clearChatMessages({
        pathParams: {
          guildId: selectedGuildId,
        },
      });

      updateChatMessagesCache({
        guildId: selectedGuildId,
        queryClient,
        updater: [],
      });
      resetInputState();
      focusEditorCaret(0);
    } catch {
      focusEditorCaret(caretIndex);
    }
  };

  const handleSubmit = async () => {
    if (!messageValue || !selectedGuildId || !world) {
      return;
    }

    const characterData = buildChatCharacterData();
    if (!characterData) {
      return;
    }

    const currentCaretIndex = caretIndex;
    const submitAction = getChatSubmitAction({
      canClearChat,
      messageValue,
    });

    if (submitAction.kind === "clear") {
      setIsClearConfirmOpen(true);
      return;
    }

    if (submitAction.kind === "party") {
      handlePartyCommand(submitAction.description, [selectedGuildId]);
      resetInputState();
      focusEditorCaret(0);
      return;
    }

    try {
      const response =
        submitAction.kind === "notification"
          ? (
              await startNotificationMessage({
                guildIds: [selectedGuildId],
                world,
                message: submitAction.message,
                sendChatMessage: (resolvedGuildIds) =>
                  sendChatMessage({
                    pathParams: {
                      guildId: resolvedGuildIds[0] ?? selectedGuildId,
                    },
                    data: buildChatMessagePayload({
                      message: submitAction.message,
                      type: getChatMessageTypeForSubmitAction(submitAction),
                      characterData,
                    }),
                  }),
              })
            ).result
          : await sendChatMessage({
              pathParams: { guildId: selectedGuildId },
              data: buildChatMessagePayload({
                message: submitAction.message,
                type: getChatMessageTypeForSubmitAction(submitAction),
                characterData,
              }),
            });

      updateChatMessagesCache({
        guildId: selectedGuildId,
        queryClient,
        updater: (old: ChatMessageResponseDtoOutput[] | undefined) =>
          upsertChatMessage(old, response),
      });
      onMessageSent?.();
      resetInputState();
      focusEditorCaret(0);
    } catch {
      focusEditorCaret(currentCaretIndex);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isClearConfirmOpen && event.key === "Escape") {
      event.preventDefault();
      setIsClearConfirmOpen(false);
      setTabCompletionSession(null);
      focusEditorCaret(caretIndex);
      return;
    }

    if (suggestionMode === null) {
      if (event.key === "Enter") {
        event.preventDefault();
        void handleSubmit();
      }

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setDismissedMentionKey(activeSuggestionKey);
      setTabCompletionSession(null);
      return;
    }

    if (activeSuggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedMentionIndex((currentIndex) => {
        if (currentIndex <= 0) {
          return activeSuggestions.length - 1;
        }

        return currentIndex - 1;
      });
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedMentionIndex((currentIndex) => {
        if (currentIndex >= activeSuggestions.length - 1) {
          return 0;
        }

        return currentIndex + 1;
      });
      return;
    }

    if (event.key === "Tab" && suggestionMode === "mention") {
      const selectedSuggestionIndex =
        selectedMentionIndex >= 0 ? selectedMentionIndex : 0;
      const selectedSuggestion = activeSuggestions[selectedSuggestionIndex];

      if (selectedSuggestion?.type !== "mention") {
        return;
      }

      event.preventDefault();
      handleMentionSuggestionSelect({
        keepTabCompletionSession: true,
        mention: activeMentionForSuggestions,
        suggestion: selectedSuggestion,
      });
      setSelectedMentionIndex((currentIndex) => {
        const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 1;

        if (nextIndex >= activeSuggestions.length) {
          return 0;
        }

        return nextIndex;
      });
      return;
    }

    if (
      event.key === "Enter" &&
      selectedMentionIndex >= 0 &&
      activeSuggestions[selectedMentionIndex]
    ) {
      event.preventDefault();
      handleSuggestionSelect(activeSuggestions[selectedMentionIndex]);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <form className="ll:flex ll:justify-center ll:flex-col ll:mt-1 ll:mr-0.5">
      <ChatReadyRoomIndicator />
      {replyDraft && (
        <div className="ll:mb-1">
          <Label className="ll:text-[9px] ll:text-gray-400">
            {t("reply.replyingTo")}
          </Label>
          <ChatReplyPreview reply={replyDraft} onClear={clearReplyDraft} />
        </div>
      )}
      <Label className="ll:text-[9px] ll:text-gray-400">
        {t("input.hint")}
      </Label>
      <div className="ll:relative ll:overflow-visible">
        <ChatMentionSuggestions
          suggestionMode={suggestionMode}
          suggestions={activeSuggestions}
          isOpen={suggestionMode !== null && activeSuggestions.length > 0}
          showNoResults={showMentionSuggestionNoResults}
          selectedIndex={selectedMentionIndex}
          onSelect={handleSuggestionSelect}
        />
        <Popover open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
          <div
            ref={clearConfirmAnchorRef}
            className={cn(
              CHAT_INPUT_SHELL_CLASS,
              !isPending && CHAT_INPUT_FOCUS_CLASS,
            )}
          >
            <ChatInputEditor
              autoFocus={autofocus}
              caretIndex={caretIndex}
              disabled={isPending}
              editorRef={editorRef}
              message={messageValue}
              mentionContext={mentionContext}
              placeholder={t("input.placeholder")}
              onChange={(nextMessage, nextCaretIndex) => {
                setMessageValue(nextMessage);
                setCaretIndex(nextCaretIndex);
                setDismissedMentionKey(null);
                setTabCompletionSession(null);
              }}
              onCaretChange={setCaretIndex}
              onKeyDown={handleInputKeyDown}
            />
          </div>
          <PopoverContent
            anchor={clearConfirmAnchorRef}
            side="top"
            align="start"
            className="ll:w-64"
            initialFocus={false}
            finalFocus={false}
          >
            <div className="ll:flex ll:flex-col ll:gap-2">
              <div className="ll:flex ll:flex-col ll:gap-1">
                <p className="ll:text-xs ll:font-semibold ll:text-white">
                  {t("input.clearChatConfirm.title")}
                </p>
                <p className="ll:text-[11px] ll:text-gray-300">
                  {t("input.clearChatConfirm.description")}
                </p>
              </div>
              <div className="ll:flex ll:justify-end ll:gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setIsClearConfirmOpen(false);
                    focusEditorCaret(caretIndex);
                  }}
                >
                  {t("input.clearChatConfirm.cancel")}
                </Button>
                <Button
                  type="button"
                  disabled={isClearingChat}
                  className="ll:border-red-500/60 ll:bg-red-500/20 ll:text-red-100 ll:hover:bg-red-500/30 ll:disabled:opacity-50"
                  onClick={() => {
                    void handleClearChatConfirm();
                  }}
                >
                  {t("input.clearChatConfirm.confirm")}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </form>
  );
};

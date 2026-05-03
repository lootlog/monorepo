import { Permission } from "@lootlog/types";
import { Label } from "@/components/ui/label";
import { MessageType } from "@/api/chat.api";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  applyChatMentionSuggestion,
  getActiveChatMention,
  getChatMentionMemberSuggestions,
  getChatMentionRoleSuggestions,
  getChatMentionSuggestions,
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
} from "@/lib/api/generated/main/guilds/guilds";
import {
  useChatControllerClearChatMessages,
  useChatControllerSendChatMessage,
} from "@/lib/api/generated/main/chat/chat";
import {
  getMembersControllerGetMeQueryKey,
  useMembersControllerGetMe,
} from "@/lib/api/generated/main/members/members";
import type { ChatMessageResponseDtoOutput } from "@/lib/api/generated/main/model";
import {
  getRolesControllerGetGuildRolesQueryKey,
  useRolesControllerGetGuildRoles,
} from "@/lib/api/generated/main/roles/roles";
import { buildChatCharacterData } from "@/lib/api/generated-helpers";
import { Game } from "@/lib/game";
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

type ChatInputProps = {
  selectedGuildId?: string;
  autofocus?: boolean;
};

const REQUIRED_CLEAR_CHAT_PERMISSIONS = [Permission.OWNER, Permission.ADMIN];

const CHAT_INPUT_SHELL_CLASS =
  "ll:h-6 ll:w-full ll:min-w-0 ll:overflow-hidden ll:rounded-sm ll:border ll:border-solid ll:border-gray-400 ll:bg-black/92 ll:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ll:transition-[color,box-shadow]";

const CHAT_INPUT_FOCUS_CLASS =
  "ll:focus-within:border-ring ll:focus-within:ring-ring/50 ll:focus-within:ring-[3px]";

export const ChatInput: FC<ChatInputProps> = ({
  selectedGuildId,
  autofocus,
}) => {
  const { t } = useTranslation("chat");
  const { t: tCommand } = useTranslation("command");
  const queryClient = useQueryClient();
  const replyDraft = useChatStore((state) => state.replyDraft);
  const clearReplyDraft = useChatStore((state) => state.clearReplyDraft);
  const editorRef = useRef<HTMLDivElement>(null);
  const world = Game.getWorldName();
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
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const pendingFocusCaretRef = useRef<number | null>(null);
  const isPending =
    isSendingMessage || isCreatingNotificationMessage || isClearingChat;
  const activeMention = getActiveChatMention({
    message: messageValue,
    caretIndex,
  });
  const activeMentionKey = activeMention
    ? `${activeMention.start}:${activeMention.end}:${activeMention.query}`
    : null;
  const commandSuggestionKey = isCommandSuggestionsInput(messageValue)
    ? `command:${messageValue}`
    : null;
  const hasMentionInput = hasChatMentionToken(messageValue);
  const isCommandInput = commandSuggestionKey !== null;
  const activeSuggestionKey = isCommandInput
    ? commandSuggestionKey
    : activeMentionKey;
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
          gcTime: Infinity,
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
        gcTime: Infinity,
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
    query: activeMention?.query ?? "",
  });
  const mentionContext = buildChatMentionContext({
    currentCharacterNick: Game.hero.nick,
    currentMember,
    members: guildMembers,
    roles: guildRoles,
  });
  const isCommandSuggestionsOpen =
    isCommandInput &&
    filteredCommandSuggestions.length > 0 &&
    !areSuggestionsDismissed;
  const isMentionSuggestionsOpen =
    !isCommandInput && activeMention !== null && !areSuggestionsDismissed;
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

  const handleMentionSuggestionSelect = (suggestion: ChatMentionSuggestion) => {
    if (!activeMention) {
      return;
    }

    const { nextMessage, nextCaretIndex } = applyChatMentionSuggestion({
      message: messageValue,
      mention: activeMention,
      suggestion,
    });

    applySelectedMessageValue({
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
  }: {
    nextCaretIndex: number;
    nextMessage: string;
  }) => {
    setMessageValue(nextMessage);
    setCaretIndex(nextCaretIndex);
    setDismissedMentionKey(null);
    focusEditorCaret(nextCaretIndex);
  };

  const buildChatMessagePayload = ({
    message,
    type,
  }: {
    message: string;
    type: typeof MessageType.NORMAL | typeof MessageType.NOTIFICATION;
  }) => {
    return {
      message,
      type,
      characterData: buildChatCharacterData(),
      replyTo: getChatReplyPayload(replyDraft),
    };
  };

  const handleSuggestionSelect = (suggestion: ChatInputSuggestion) => {
    if (suggestion.type === "command") {
      handleCommandSuggestionSelect(suggestion);
      return;
    }

    handleMentionSuggestionSelect(suggestion);
  };

  const resetInputState = () => {
    setMessageValue("");
    setCaretIndex(0);
    setDismissedMentionKey(null);
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
      return;
    }
  };

  const handleSubmit = async () => {
    if (!messageValue || !selectedGuildId || !world) {
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
                    }),
                  }),
              })
            ).result
          : await sendChatMessage({
              pathParams: { guildId: selectedGuildId },
              data: buildChatMessagePayload({
                message: submitAction.message,
                type: getChatMessageTypeForSubmitAction(submitAction),
              }),
            });

      updateChatMessagesCache({
        guildId: selectedGuildId,
        queryClient,
        updater: (old: ChatMessageResponseDtoOutput[] | undefined) =>
          upsertChatMessage(old, response),
      });
      resetInputState();
      focusEditorCaret(0);
    } catch {
      focusEditorCaret(currentCaretIndex);
      return;
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isClearConfirmOpen && event.key === "Escape") {
      event.preventDefault();
      setIsClearConfirmOpen(false);
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
    <form className="ll:flex ll:justify-center ll:flex-col ll:mt-1">
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
          <PopoverAnchor asChild>
            <div
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
                }}
                onCaretChange={setCaretIndex}
                onKeyDown={handleInputKeyDown}
              />
            </div>
          </PopoverAnchor>
          <PopoverContent
            side="top"
            align="start"
            className="ll:w-64"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
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

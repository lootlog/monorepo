import { createAccessPolicy } from "@lootlog/access-policy";
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
import {
  ChatInputEditor,
  type ChatInputEditorHandle,
} from "@/features/chat/components/chat-input-editor";
import { ChatReplyPreview } from "@/features/chat/components/chat-reply-preview";
import {
  ChatMentionSuggestions,
  type ChatInputSuggestion,
} from "@/features/chat/components/chat-mention-suggestions";
import { upsertChatMessage } from "@/features/chat/chat.helpers";
import { CHAT_QUERY_GC_TIME_MS } from "@/features/chat/chat.constants";
import {
  isNotificationRateLimitError,
  useNotificationChatOrchestration,
} from "@/features/chat/hooks/use-notification-chat-orchestration";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

const getActiveMentionForSuggestions = ({
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

const resolveSuggestionKeys = (
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

const resolveSuggestionPresentation = ({
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

const shouldLoadChatMentionData = (
  selectedGuildId: string,
  hasMentionInput: boolean,
  isCommandInput: boolean,
) => selectedGuildId !== "" && hasMentionInput && !isCommandInput;

const getChatMentionQueryData = <MemberItem, RoleItem>({
  members,
  roles,
}: {
  members: MemberItem[] | undefined;
  roles: RoleItem[] | undefined;
}) => ({
  members: members ?? [],
  roles: roles ?? [],
});

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
  const editorRef = useRef<ChatInputEditorHandle>(null);
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
  const [requestedMentionIndex, setRequestedMentionIndex] = useState(-1);
  const [dismissedMentionKey, setDismissedMentionKey] = useState<string | null>(
    null,
  );
  const [tabCompletionSession, setTabCompletionSession] =
    useState<TabCompletionSession | null>(null);
  const [clearConfirmRequested, setIsClearConfirmOpen] = useState(false);
  const pendingFocusCaretRef = useRef<number | null>(null);
  const submissionInProgressRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPending =
    isSubmitting ||
    isSendingMessage ||
    isCreatingNotificationMessage ||
    isClearingChat;
  const resolvedGuildId = selectedGuildId ?? "";
  const activeMention = getActiveChatMention({
    message: messageValue,
    caretIndex,
  });
  const activeMentionForSuggestions = getActiveMentionForSuggestions({
    activeMention,
    caretIndex,
    messageValue,
    tabCompletionSession,
  });
  const hasMentionInput = hasChatMentionToken(messageValue);
  const { activeSuggestionKey, areSuggestionsDismissed, isCommandInput } =
    resolveSuggestionKeys(
      messageValue,
      activeMentionForSuggestions,
      dismissedMentionKey,
    );
  const shouldLoadMentionData = shouldLoadChatMentionData(
    resolvedGuildId,
    hasMentionInput,
    isCommandInput,
  );
  const guildPermissionsQuery = useGuildsControllerGetGuildPermissions(
    { guildId: resolvedGuildId },
    {
      query: {
        queryKey: getGuildsControllerGetGuildPermissionsQueryKey({
          guildId: resolvedGuildId,
        }),
        enabled: Boolean(selectedGuildId),
        staleTime: 5 * 60 * 1000,
      },
    },
  );
  const guildMembersQuery = useGuildMembersSummary(
    { guildId: resolvedGuildId },
    {
      query: {
        enabled: shouldLoadMentionData,
      },
    },
  );
  const isFetchingMemberNames = guildMembersQuery.isFetching;
  const guildRolesQuery = useRolesControllerGetGuildRoles(
    { guildId: resolvedGuildId },
    {
      query: {
        queryKey: getRolesControllerGetGuildRolesQueryKey({
          guildId: resolvedGuildId,
        }),
        enabled: shouldLoadMentionData,
        gcTime: CHAT_QUERY_GC_TIME_MS,
        staleTime: 5 * 60 * 1000,
      },
    },
  );
  const isFetchingRoleNames = guildRolesQuery.isFetching;
  const { members: guildMembers, roles: guildRoles } = getChatMentionQueryData({
    members: guildMembersQuery.data,
    roles: guildRolesQuery.data,
  });
  const { data: currentMember } = useMembersControllerGetMe(
    { guildId: resolvedGuildId },
    {
      query: {
        queryKey: getMembersControllerGetMeQueryKey({
          guildId: resolvedGuildId,
        }),
        enabled: shouldLoadMentionData,
        gcTime: CHAT_QUERY_GC_TIME_MS,
        staleTime: 5 * 60 * 1000,
      },
    },
  );
  const memberSuggestions = getChatMentionMemberSuggestions(guildMembers);
  const roleSuggestions = getChatMentionRoleSuggestions(guildRoles);
  const accessPolicy = createAccessPolicy({
    capabilities: guildPermissionsQuery.data ?? [],
  });
  const canClearChat = accessPolicy.allowsAny(REQUIRED_CLEAR_CHAT_PERMISSIONS);
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
  const {
    activeSuggestions,
    isMentionSuggestionsOpen,
    showMentionSuggestionNoResults,
    suggestionMode,
  } = resolveSuggestionPresentation({
    activeMention: activeMentionForSuggestions,
    areSuggestionsDismissed,
    filteredCommandSuggestions,
    isCommandInput,
    isFetchingMemberNames,
    isFetchingRoleNames,
    mentionSuggestions,
  });
  const isClearChatCommand = messageValue.trim() === "/clr";
  const selectedMentionIndex =
    suggestionMode === null || activeSuggestions.length === 0
      ? -1
      : requestedMentionIndex >= 0 &&
          requestedMentionIndex < activeSuggestions.length
        ? requestedMentionIndex
        : 0;
  const setSelectedMentionIndex = (
    update: (currentIndex: number) => number,
  ) => {
    setRequestedMentionIndex(update(selectedMentionIndex));
  };
  const isClearConfirmOpen = isClearChatCommand && clearConfirmRequested;

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

  const focusEditorCaret = (nextCaretIndex: number) => {
    pendingFocusCaretRef.current = nextCaretIndex;

    requestAnimationFrame(() => {
      if (isPending) {
        return;
      }

      editorRef.current?.focus(nextCaretIndex);
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

      editorRef.current?.focus(nextCaretIndex);
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
    setRequestedMentionIndex(-1);
    clearReplyDraft();
    setIsClearConfirmOpen(false);
    editorRef.current?.setValue("", 0);
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
      toast.error(t("errors.clearFailed"));
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

    if (submissionInProgressRef.current) {
      return;
    }

    submissionInProgressRef.current = true;
    setIsSubmitting(true);

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
    } catch (error) {
      if (
        submitAction.kind === "notification" &&
        isNotificationRateLimitError(error)
      ) {
        toast.error(tCommand("errors.notificationRateLimited"));
      } else {
        toast.error(t("errors.sendFailed"));
      }
      focusEditorCaret(currentCaretIndex);
    } finally {
      submissionInProgressRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }

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
      setSelectedMentionIndex((currentIndex) =>
        currentIndex <= 0 ? activeSuggestions.length - 1 : currentIndex - 1,
      );
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedMentionIndex((currentIndex) =>
        currentIndex >= activeSuggestions.length - 1 ? 0 : currentIndex + 1,
      );
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
          isLoading={
            isMentionSuggestionsOpen &&
            (isFetchingMemberNames || isFetchingRoleNames)
          }
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
              ref={editorRef}
              autoFocus={autofocus}
              caretIndex={caretIndex}
              disabled={isPending}
              message={messageValue}
              mentionContext={mentionContext}
              placeholder={t("input.placeholder")}
              onChange={(nextMessage, nextCaretIndex) => {
                setMessageValue(nextMessage);
                setCaretIndex(nextCaretIndex);
                setDismissedMentionKey(null);
                setTabCompletionSession(null);
                setRequestedMentionIndex(-1);
                if (nextMessage.trim() !== "/clr") {
                  setIsClearConfirmOpen(false);
                }
              }}
              onCaretChange={setCaretIndex}
              onKeyDown={handleInputKeyDown}
            />
            {isPending ? (
              <Loader2
                aria-label={t("input.pending")}
                className="ll:pointer-events-none ll:absolute ll:right-1 ll:top-1/2 ll:size-3.5 ll:-translate-y-1/2 ll:animate-spin ll:motion-reduce:animate-none"
              />
            ) : null}
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
                  {isClearingChat ? (
                    <Loader2
                      aria-hidden
                      className="ll:size-3 ll:animate-spin ll:motion-reduce:animate-none"
                    />
                  ) : (
                    t("input.clearChatConfirm.confirm")
                  )}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </form>
  );
};

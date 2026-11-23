import { useChatSendError } from "@/features/chat/hooks/use-chat-send-error";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
import type { InputVariant } from "@/components/ui/input";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Capability } from "@lootlog/schema/permissions";
import type { MessageType } from "@/api/chat.api";
import {
  applyChatMentionSuggestion,
  getActiveChatMention,
  getChatMentionSuggestionDisplayLabel,
  getChatMentionSuggestions,
  type ActiveChatMention,
  type ChatMentionSuggestion,
} from "@/features/chat/chat-mention-suggestions.helpers";
import { hasChatMentionToken } from "@/features/chat/chat-mentions.helpers";
import {
  getActiveMentionForSuggestions,
  resolveSelectedSuggestionIndex,
  resolveSuggestionKeys,
  resolveSuggestionPresentation,
  type TabCompletionSession,
} from "@/features/chat/chat-input-suggestions.helpers";
import type { ChatInputEditorHandle } from "@/features/chat/components/chat-input-editor";
import type { ChatInputSuggestion } from "@/features/chat/components/chat-mention-suggestions";
import { upsertChatMessage } from "@/features/chat/chat.helpers";
import { useChatMentionData } from "@/features/chat/hooks/use-chat-mention-data";
import {
  NotificationChatPublishError,
  useNotificationChatOrchestration,
} from "@/features/chat/hooks/use-notification-chat-orchestration";
import {
  filterCommandSuggestions,
  getCommandSuggestionInsertValue,
  getCommandSuggestions,
  type CommandSuggestion,
} from "@/features/command/command-suggestions.helpers";
import { usePartyCommand } from "@/features/command/hooks/use-party-command";
import { getGuildPermissionsQueryOptions } from "@/hooks/api/guild-permissions-query";
import {
  useChatControllerClearChatMessages,
  useChatControllerSendChatMessage,
  type ChatMessageResponseDtoOutput,
} from "@lootlog/client/main";
import { buildChatCharacterData } from "@/lib/api/generated-helpers";
import { useGameStore } from "@/store/game.store";
import { useChatStore } from "@/store/chat.store";
import { getDefaultComposeDraft } from "@/features/chat/chat-command-prefix";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { updateChatMessagesCache } from "@/features/chat/chat-query-cache.helpers";
import {
  getChatMessageTypeForSubmitAction,
  getChatReplyPayload,
  getChatSubmitAction,
} from "@/features/chat/chat-submit.helpers";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

export type ChatInputProps = {
  variant?: InputVariant;
  selectedGuildId?: string;
  autofocus?: boolean;
};

export type ChatComposerOptions = ChatInputProps & {
  draftKey?: string;
  handlesReplies?: boolean;
  onEscape?: () => void;
  onSubmitted?: () => void;
};

const REQUIRED_CLEAR_CHAT_PERMISSIONS = [Capability.OWNER, Capability.ADMIN];

export function useChatInputController({
  variant = "default",
  selectedGuildId,
  autofocus,
  draftKey = selectedGuildId ?? "",
  handlesReplies = true,
  onEscape,
  onSubmitted,
}: ChatComposerOptions) {
  const { t } = useTranslation("chat");
  const { t: tCommand } = useTranslation("command");
  const queryClient = useQueryClient();
  const reportSendError = useChatSendError();

  const replyDraft = useChatStore((state) =>
    handlesReplies
      ? state.replyDraftsByGuild[selectedGuildId ?? ""]
      : undefined,
  );

  const focusRequest = useChatStore((state) =>
    handlesReplies ? state.focusRequest : null,
  );

  const clearReplyDraft = () => {
    if (handlesReplies)
      useChatStore.getState().clearReplyDraft(selectedGuildId ?? "");
  };

  const editorRef = useRef<ChatInputEditorHandle>(null);
  const currentGuildRef = useRef(selectedGuildId);
  useEffect(() => {
    currentGuildRef.current = selectedGuildId;
  }, [selectedGuildId]);
  const clearConfirmAnchorRef = useRef<HTMLDivElement>(null);
  const world = useGameStore((state) => state.game?.world ?? "unknown");

  const { mutateAsync: sendChatMessage, isPending: isSendingMessage } =
    useChatControllerSendChatMessage();

  const { mutateAsync: clearChatMessages, isPending: isClearingChat } =
    useChatControllerClearChatMessages();

  const { isCreatingNotificationMessage, startNotificationMessage } =
    useNotificationChatOrchestration();

  const { handlePartyCommand } = usePartyCommand();

  const defaultDraft = useChatStore((state) =>
    getDefaultComposeDraft(state.defaultComposeMode),
  );

  const messageValue = useChatStore(
    (state) => state.draftsByGuild[draftKey] ?? defaultDraft,
  );

  const setMessageValue = (message: string) =>
    useChatStore.getState().setDraft(draftKey, message);

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

  const isPending = [
    isSubmitting,
    isSendingMessage,
    isCreatingNotificationMessage,
    isClearingChat,
  ].includes(true);

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

  const guildPermissionsQuery = useQuery(
    getGuildPermissionsQueryOptions(resolvedGuildId, {
      enabled: Boolean(selectedGuildId),
    }),
  );

  const {
    isFetchingMemberNames,
    isFetchingRoleNames,
    memberSuggestions,
    mentionContext,
    roleSuggestions,
  } = useChatMentionData({
    guildId: resolvedGuildId,
    hasMentionInput,
    isCommandInput,
  });

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

  const selectedMentionIndex = resolveSelectedSuggestionIndex(
    suggestionMode === null ? 0 : activeSuggestions.length,
    requestedMentionIndex,
  );

  const setSelectedMentionIndex = (
    update: (currentIndex: number) => number,
  ) => {
    setRequestedMentionIndex(update(selectedMentionIndex));
  };

  const isClearConfirmOpen = isClearChatCommand && clearConfirmRequested;

  useEffect(() => {
    if (focusRequest?.guildId !== selectedGuildId) return;

    const frame = requestAnimationFrame(() =>
      editorRef.current?.focus(
        useChatStore.getState().draftsByGuild[draftKey]?.length ?? 0,
      ),
    );

    return () => cancelAnimationFrame(frame);
  }, [draftKey, focusRequest, selectedGuildId]);

  const focusEditorCaret = (nextCaretIndex: number) => {
    if (currentGuildRef.current !== selectedGuildId) return;
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
      replyTo: getChatReplyPayload(replyDraft ?? null),
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
    useChatStore.getState().clearDraft(draftKey);
    clearReplyDraft();

    if (currentGuildRef.current !== selectedGuildId) return;
    setCaretIndex(defaultDraft.length);
    setDismissedMentionKey(null);
    setTabCompletionSession(null);
    setRequestedMentionIndex(-1);
    setIsClearConfirmOpen(false);
    editorRef.current?.setValue(defaultDraft, defaultDraft.length);
  };

  const completeSubmission = () => {
    resetInputState();

    if (onSubmitted) {
      onSubmitted();

      return;
    }

    focusEditorCaret(defaultDraft.length);
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
      completeSubmission();
    } catch {
      showRuntimeMessage(t("errors.clearFailed"));
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
      handlePartyCommand(submitAction.description, selectedGuildId);
      completeSubmission();

      return;
    }

    if (submitAction.kind === "notification" && !submitAction.message.trim()) {
      return;
    }

    if (submissionInProgressRef.current) {
      return;
    }

    const submit = async () => {
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
        completeSubmission();
      } catch (error) {
        reportSendError(error);

        if (error instanceof NotificationChatPublishError) {
          completeSubmission();
        } else {
          focusEditorCaret(currentCaretIndex);
        }
      }
    };

    submissionInProgressRef.current = true;
    setIsSubmitting(true);

    await submit().finally(() => {
      submissionInProgressRef.current = false;
      setIsSubmitting(false);
    });
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (suggestionMode === null) {
      if (event.key === "Enter") {
        event.preventDefault();
        void handleSubmit();
      }

      if (event.key === "Escape" && onEscape) {
        event.preventDefault();
        onEscape();
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

  const replaceMessage = (nextMessage: string) =>
    applySelectedMessageValue({
      nextCaretIndex: nextMessage.length,
      nextMessage,
    });

  return {
    t,
    replyDraft,
    clearReplyDraft,
    editorRef,
    clearConfirmAnchorRef,
    isClearingChat,
    messageValue,
    setMessageValue,
    caretIndex,
    setCaretIndex,
    setRequestedMentionIndex,
    setDismissedMentionKey,
    setTabCompletionSession,
    setIsClearConfirmOpen,
    isPending,
    isFetchingMemberNames,
    isFetchingRoleNames,
    mentionContext,
    activeSuggestions,
    isMentionSuggestionsOpen,
    showMentionSuggestionNoResults,
    suggestionMode,
    selectedMentionIndex,
    isClearConfirmOpen,
    focusEditorCaret,
    handleSuggestionSelect,
    handleClearChatConfirm,
    handleInputKeyDown,
    replaceMessage,
    variant,
    selectedGuildId,
    autofocus,
  };
}

import { inputVariantClasses } from "@/components/ui/input";
import { ChatQuickActionStrip } from "./chat-quick-action-strip";
import { ConfirmPopover } from "@/components/confirm-popover";
import { ChatInputEditor } from "@/features/chat/components/chat-input-editor";
import { ChatReplyPreview } from "@/features/chat/components/chat-reply-preview";
import { ChatMentionSuggestions } from "@/features/chat/components/chat-mention-suggestions";
import { cn } from "cn";
import { WindowFooter } from "@/components/draggable-window/window-footer";
import { Loader2 } from "lucide-react";
import {
  useChatInputController,
  type ChatInputProps,
} from "./use-chat-input-controller";

const FOCUS_RING_CLASSES =
  "ll:focus-within:border-ring ll:focus-within:ring-ring/50 ll:focus-within:ring-[3px]";

const CHAT_INPUT_FOCUS_CLASSES = {
  default: FOCUS_RING_CLASSES,
  filled: FOCUS_RING_CLASSES,
  borderless: "",
};

const CHAT_INPUT_SHELL_CLASS =
  "ll:h-6 ll:w-full ll:min-w-0 ll:overflow-hidden ll:transition-[color,box-shadow]";

export function ChatInput(props: ChatInputProps) {
  const {
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
    variant,
    selectedGuildId,
    autofocus,
  } = useChatInputController(props);

  const composeRow = (
    <>
      <div
        className={cn(
          "ll:relative ll:min-w-0 ll:flex-1 ll:overflow-visible",
          variant === "borderless" && "ll:self-stretch",
        )}
      >
        <div
          ref={clearConfirmAnchorRef}
          className={cn(
            CHAT_INPUT_SHELL_CLASS,
            inputVariantClasses[variant],
            variant === "borderless" && "ll:h-full",
            !isPending && CHAT_INPUT_FOCUS_CLASSES[variant],
            variant === "default" &&
              "ll:bg-black/92 ll:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
          )}
        >
          <ChatInputEditor
            ref={editorRef}
            autoFocus={autofocus}
            caretIndex={caretIndex}
            disabled={isPending || !selectedGuildId}
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
        <ConfirmPopover
          open={isClearConfirmOpen}
          onOpenChange={(open) => {
            setIsClearConfirmOpen(open);

            if (!open) focusEditorCaret(caretIndex);
          }}
          anchor={clearConfirmAnchorRef}
          finalFocus={false}
          title={t("input.clearChatConfirm.title")}
          description={t("input.clearChatConfirm.description")}
          confirmLabel={t("input.clearChatConfirm.confirm")}
          pending={isClearingChat}
          onConfirm={() => void handleClearChatConfirm()}
        />
      </div>
      <ChatQuickActionStrip guildId={selectedGuildId} />
    </>
  );

  return (
    <form
      className={cn(
        "ll:relative ll:flex ll:justify-center ll:flex-col",
        variant === "default" && "ll:mt-1",
      )}
    >
      {replyDraft && (
        <div className="ll:border-t ll:border-x-0 ll:border-b-0 ll:border-gray-400/40">
          <ChatReplyPreview
            variant="compact"
            reply={replyDraft}
            onClear={() => {
              clearReplyDraft();
              focusEditorCaret(caretIndex);
            }}
          />
        </div>
      )}
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
      {variant === "borderless" ? (
        <WindowFooter rowClassName="ll:gap-1 ll:pl-1">
          {composeRow}
        </WindowFooter>
      ) : (
        <div className="ll:flex ll:items-center ll:gap-1">{composeRow}</div>
      )}
    </form>
  );
}

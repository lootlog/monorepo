import { inputVariantClasses } from "@/components/ui/input";
import { ChatQuickActionStrip } from "./chat-quick-action-strip";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { ChatInputEditor } from "@/features/chat/components/chat-input-editor";
import { ChatReplyPreview } from "@/features/chat/components/chat-reply-preview";
import { ChatMentionSuggestions } from "@/features/chat/components/chat-mention-suggestions";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  useChatInputController,
  type ChatInputProps,
} from "./use-chat-input-controller";

const CHAT_INPUT_FOCUS_CLASSES = {
  default:
    "ll:focus-within:border-ring ll:focus-within:ring-ring/50 ll:focus-within:ring-[3px]",
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

  return (
    <form
      className={cn(
        "ll:relative ll:flex ll:justify-center ll:flex-col",
        variant === "default" && "ll:mt-1",
      )}
    >
      {replyDraft && (
        <div className="ll:border-solid ll:border-t ll:border-x-0 ll:border-b-0 ll:border-gray-400/40">
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
      <div
        className={cn("ll:flex ll:items-center ll:gap-1", {
          "ll:border-solid ll:border-t ll:border-x-0 ll:border-b-0 ll:border-gray-400/40 ll:pl-1":
            variant === "borderless",
        })}
      >
        <div className="ll:relative ll:min-w-0 ll:flex-1 ll:overflow-visible">
          <Popover
            open={isClearConfirmOpen}
            onOpenChange={setIsClearConfirmOpen}
          >
            <div
              ref={clearConfirmAnchorRef}
              className={cn(
                CHAT_INPUT_SHELL_CLASS,
                inputVariantClasses[variant],
                variant === "borderless" && "ll:h-8",
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
                  <p className="ll:text-xs ll:font-semibold ll:text-popover-foreground">
                    {t("input.clearChatConfirm.title")}
                  </p>
                  <p className="ll:text-[11px] ll:text-muted-foreground">
                    {t("input.clearChatConfirm.description")}
                  </p>
                </div>
                <div className="ll:flex ll:justify-end ll:gap-2">
                  <Button
                    variant="menu"
                    type="button"
                    onClick={() => {
                      setIsClearConfirmOpen(false);
                      focusEditorCaret(caretIndex);
                    }}
                  >
                    {t("input.clearChatConfirm.cancel")}
                  </Button>
                  <Button
                    variant="menu"
                    type="button"
                    disabled={isClearingChat}
                    className="ll:text-red-700 ll:in-[.dark-theme]:text-red-400 ll:hover:bg-red-500/10 ll:focus-visible:bg-red-500/10"
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
        <ChatQuickActionStrip guildId={selectedGuildId} />
      </div>
    </form>
  );
}

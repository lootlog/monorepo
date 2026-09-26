import { inputVariantClasses } from "@/components/ui/input";
import { ChatQuickActionStrip } from "./chat-quick-action-strip";
import { ChatComposeField } from "@/features/chat/components/chat-compose-field";
import { ChatComposeModeIcon } from "@/features/chat/components/chat-compose-mode-icon";
import { ChatReplyPreview } from "@/features/chat/components/chat-reply-preview";
import { ChatMentionSuggestions } from "@/features/chat/components/chat-mention-suggestions";
import { cn } from "cn";
import { WindowFooter } from "@/components/draggable-window/window-footer";
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

export function ChatInput(props: ChatInputProps) {
  const controller = useChatInputController(props);

  const {
    replyDraft,
    clearReplyDraft,
    caretIndex,
    isPending,
    isFetchingMemberNames,
    isFetchingRoleNames,
    activeSuggestions,
    isMentionSuggestionsOpen,
    showMentionSuggestionNoResults,
    suggestionMode,
    selectedMentionIndex,
    focusEditorCaret,
    handleSuggestionSelect,
    variant,
    selectedGuildId,
  } = controller;

  const composeRow = (
    <>
      <ChatComposeModeIcon
        message={controller.messageValue}
        className="ll:ml-1 ll:size-3.5"
      />
      <ChatComposeField
        controller={controller}
        className={cn(
          "ll:overflow-visible",
          variant === "borderless" && "ll:self-stretch",
        )}
        shellClassName={cn(
          "ll:h-6",
          inputVariantClasses[variant],
          variant === "borderless" && "ll:h-full",
          !isPending && CHAT_INPUT_FOCUS_CLASSES[variant],
          variant === "default" &&
            "ll:bg-black/92 ll:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        )}
      />
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

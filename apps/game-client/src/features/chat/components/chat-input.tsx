import { SendHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import { inputVariantClasses } from "@/components/ui/input";
import { useMobileMode } from "@/hooks/ui/use-mobile-mode";
import { ChatQuickActionStrip } from "./chat-quick-action-strip";
import { ChatComposeField } from "@/features/chat/components/chat-compose-field";
import { ChatComposeModeMenu } from "@/features/chat/components/chat-compose-mode-menu";
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
  const { t: tCommon } = useTranslation("common");
  const { isMobile } = useMobileMode();
  const controller = useChatInputController(props);

  const {
    replyDraft,
    clearReplyDraft,
    caretIndex,
    messageValue,
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
    handleSubmit,
    variant,
    selectedGuildId,
  } = controller;

  const composeRow = (
    <>
      <ChatComposeModeMenu
        controller={controller}
        side="top"
        iconClassName="ll:size-3.5"
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
      {isMobile ? (
        <IconButton
          label={tCommon("actions.send")}
          disabled={isPending || messageValue.trim().length === 0}
          onClick={() => void handleSubmit()}
        >
          <SendHorizontal className="ll:size-4" aria-hidden="true" />
        </IconButton>
      ) : null}
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
        <div className="ll:border-t ll:border-x-0 ll:border-b-0 ll:border-separator">
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
        <WindowFooter rowClassName="ll:pl-1 ll:pr-0">{composeRow}</WindowFooter>
      ) : (
        <div className="ll:flex ll:items-center ll:gap-1">{composeRow}</div>
      )}
    </form>
  );
}

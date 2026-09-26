import { ConfirmPopover } from "@/components/confirm-popover";
import { ChatInputEditor } from "@/features/chat/components/chat-input-editor";
import type { ChatCommandHints } from "@/features/chat/components/chat-input-tokens-plugin";
import type { useChatInputController } from "./use-chat-input-controller";
import { cn } from "cn";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type ChatComposeFieldProps = {
  controller: ReturnType<typeof useChatInputController>;
  className?: string;
  /** Border, height and focus styling of the box around the editor. */
  shellClassName?: string;
  size?: "sm" | "md";
};

/**
 * The editable part of a chat composer, shared by the chat window and the
 * console: the editor with its command chip and mentions, the sending
 * spinner and the `/clr` confirmation.
 */
export function ChatComposeField({
  controller,
  className,
  shellClassName,
  size,
}: ChatComposeFieldProps) {
  const { t } = useTranslation("chat");

  const {
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
    mentionContext,
    isClearConfirmOpen,
    focusEditorCaret,
    handleClearChatConfirm,
    handleInputKeyDown,
    selectedGuildId,
    autofocus,
  } = controller;

  const commandHints: ChatCommandHints = {
    notification: t("input.commandHints.notification"),
    party: t("input.commandHints.party"),
  };

  return (
    <div className={cn("ll:relative ll:min-w-0 ll:flex-1", className)}>
      <div
        ref={clearConfirmAnchorRef}
        className={cn(
          "ll:relative ll:w-full ll:min-w-0 ll:overflow-hidden ll:transition-[color,box-shadow]",
          shellClassName,
        )}
      >
        <ChatInputEditor
          ref={editorRef}
          autoFocus={autofocus}
          caretIndex={caretIndex}
          commandHints={commandHints}
          disabled={isPending || !selectedGuildId}
          message={messageValue}
          mentionContext={mentionContext}
          size={size}
          placeholder={
            selectedGuildId
              ? t("input.placeholder")
              : t("input.selectGuildPlaceholder")
          }
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
  );
}

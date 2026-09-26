import { getTextColor } from "@/utils/notifications-and-detector/background";
import { getChatSubmitAction } from "@/features/chat/chat-submit.helpers";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ChatInputConstraintsPlugin } from "@/features/chat/components/chat-input-constraints-plugin";
import { ChatInputEditorPlugin } from "@/features/chat/components/chat-input-editor-plugin";
import {
  ChatInputTokensPlugin,
  type ChatCommandHints,
} from "@/features/chat/components/chat-input-tokens-plugin";
import { ChatMentionNode } from "@/features/chat/chat-mention-node";
import { ChatCommandNode } from "@/features/chat/chat-command-node";
import {
  focusChatInputEditor,
  setChatInputEditorValue,
} from "@/features/chat/chat-input-editor.helpers";
import type { ChatMentionContext } from "@/features/chat/chat-mentions.helpers";
import { cn } from "cn";
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
} from "react";
import type { LexicalEditor } from "lexical";

type ChatInputEditorProps = {
  autoFocus?: boolean;
  caretIndex: number;
  /** Ghost text shown after a command chip until the player types its argument. */
  commandHints?: ChatCommandHints;
  disabled?: boolean;
  message: string;
  mentionContext?: ChatMentionContext;
  placeholder: string;
  className?: string;
  onChange: (message: string, caretIndex: number) => void;
  onCaretChange: (caretIndex: number) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  /** `md` is the larger text of the console. */
  size?: "sm" | "md";
};

const TEXT_SIZE_CLASS_NAMES = {
  sm: "ll:text-xs ll:leading-[14px]",
  md: "ll:text-[13px] ll:leading-[18px]",
};

export type ChatInputEditorHandle = {
  focus: (caretIndex: number) => void;
  setValue: (message: string, caretIndex: number) => void;
};

const initialConfig = {
  namespace: "LootlogChatInput",
  nodes: [ChatMentionNode, ChatCommandNode],
  onError: (error: Error) => {
    throw error;
  },
};

export const ChatInputEditor = forwardRef<
  ChatInputEditorHandle,
  ChatInputEditorProps
>(function ChatInputEditor(
  {
    autoFocus,
    caretIndex,
    commandHints,
    disabled,
    message,
    mentionContext,
    placeholder,
    className,
    onChange,
    onCaretChange,
    onKeyDown,
    size = "sm",
  },
  ref,
) {
  const lexicalEditorRef = useRef<LexicalEditor>(null);

  useImperativeHandle(ref, () => ({
    focus: (nextCaretIndex) => {
      const editor = lexicalEditorRef.current;

      if (editor) {
        focusChatInputEditor({
          caretIndex: nextCaretIndex,
          editor,
        });
      }
    },
    setValue: (nextMessage, nextCaretIndex) => {
      const editor = lexicalEditorRef.current;

      if (editor) {
        setChatInputEditorValue({
          caretIndex: nextCaretIndex,
          editor,
          message: nextMessage,
        });
      }
    },
  }));

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div
        className={cn("ll:relative ll:h-full ll:w-full ll:min-w-0", className)}
      >
        <PlainTextPlugin
          ErrorBoundary={LexicalErrorBoundary}
          contentEditable=<ContentEditable
            role="textbox"
            aria-label={placeholder}
            aria-multiline={false}
            spellCheck={false}
            tabIndex={disabled ? -1 : 0}
            data-slot="chat-input"
            style={{
              color:
                getChatSubmitAction({
                  canClearChat: false,
                  messageValue: message,
                }).kind === "notification"
                  ? getTextColor("message", true)
                  : undefined,
            }}
            className={cn(
              "ll:block ll:content-center ll:h-full ll:w-full ll:min-w-0 ll:overflow-x-auto ll:overflow-y-hidden ll:px-1 ll:py-0 ll:text-white ll:caret-white ll:cursor-text ll:outline-none ll:whitespace-pre ll:[&>p]:m-0",
              TEXT_SIZE_CLASS_NAMES[size],
              disabled && "ll:cursor-not-allowed ll:opacity-50",
            )}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            onInput={(event) => {
              event.stopPropagation();
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              onKeyDown?.(event);
            }}
            onKeyUp={(event) => {
              event.stopPropagation();
            }}
            onPaste={(event) => {
              event.stopPropagation();
            }}
            onCut={(event) => {
              event.stopPropagation();
            }}
          />
          placeholder=<span
            aria-hidden
            className={cn(
              "ll:pointer-events-none ll:absolute ll:left-1 ll:top-1/2 ll:-translate-y-1/2 ll:text-gray-500",
              TEXT_SIZE_CLASS_NAMES[size],
            )}
          >
            {placeholder}
          </span>
        />
        <HistoryPlugin />
        <EditorRefPlugin editorRef={lexicalEditorRef} />
        <ChatInputConstraintsPlugin />
        <ChatInputTokensPlugin
          commandHints={commandHints}
          mentionContext={mentionContext}
        />
        {autoFocus && <AutoFocusPlugin defaultSelection="rootEnd" />}
        <ChatInputEditorPlugin
          caretIndex={caretIndex}
          disabled={disabled}
          message={message}
          onChange={onChange}
          onCaretChange={onCaretChange}
        />
      </div>
    </LexicalComposer>
  );
});

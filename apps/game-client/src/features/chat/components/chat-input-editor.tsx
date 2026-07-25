import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ChatInputConstraintsPlugin } from "@/features/chat/components/chat-input-constraints-plugin";
import { ChatInputEditorPlugin } from "@/features/chat/components/chat-input-editor-plugin";
import { ChatInputMentionsPlugin } from "@/features/chat/components/chat-input-mentions-plugin";
import { ChatMentionNode } from "@/features/chat/chat-mention-node";
import {
  focusChatInputEditor,
  setChatInputEditorValue,
} from "@/features/chat/chat-input-editor.helpers";
import type { ChatMentionContext } from "@/features/chat/chat-mentions.helpers";
import { cn } from "@/lib/utils";
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
  disabled?: boolean;
  message: string;
  mentionContext?: ChatMentionContext;
  placeholder: string;
  className?: string;
  onChange: (message: string, caretIndex: number) => void;
  onCaretChange: (caretIndex: number) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
};

export type ChatInputEditorHandle = {
  focus: (caretIndex: number) => void;
  setValue: (message: string, caretIndex: number) => void;
};

const initialConfig = {
  namespace: "LootlogChatInput",
  nodes: [ChatMentionNode],
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
    disabled,
    message,
    mentionContext,
    placeholder,
    className,
    onChange,
    onCaretChange,
    onKeyDown,
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
        className={cn(
          "ll:relative ll:h-full ll:w-full ll:min-w-0 ll:box-border",
          className,
        )}
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
            className={cn(
              "ll:box-border ll:block ll:h-full ll:w-full ll:min-w-0 ll:overflow-x-auto ll:overflow-y-hidden ll:px-1 ll:py-1 ll:text-xs ll:leading-[14px] ll:text-white ll:outline-none ll:whitespace-pre",
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
            className="ll:pointer-events-none ll:absolute ll:left-1 ll:top-1 ll:text-xs ll:leading-[14px] ll:text-gray-500"
          >
            {placeholder}
          </span>
        />
        <HistoryPlugin />
        <EditorRefPlugin editorRef={lexicalEditorRef} />
        <ChatInputConstraintsPlugin />
        <ChatInputMentionsPlugin mentionContext={mentionContext} />
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

import {
  CHAT_EDITOR_MAX_LENGTH,
  getChatEditorSelectionOffsets,
  normalizeChatEditorText,
  restoreChatEditorSelection,
} from "@/features/chat/chat-editor-selection.helpers";
import { ChatMentionText } from "@/features/chat/components/chat-mention-text";
import {
  getChatMentionSegments,
  type ChatMentionContext,
} from "@/features/chat/chat-mentions.helpers";
import { cn } from "@/lib/utils";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ClipboardEvent,
  type FC,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";

type ChatInputEditorProps = {
  autoFocus?: boolean;
  caretIndex: number;
  disabled?: boolean;
  message: string;
  mentionContext?: ChatMentionContext;
  placeholder: string;
  className?: string;
  editorRef: RefObject<HTMLDivElement | null>;
  onChange: (message: string, caretIndex: number) => void;
  onCaretChange: (caretIndex: number) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
};

const CARET_SCROLL_PADDING = 8;

const isNodeInsideEditor = ({
  editor,
  node,
}: {
  editor: HTMLDivElement;
  node: Node | null;
}) => {
  if (!node) {
    return false;
  }

  return node === editor || editor.contains(node);
};

export const ChatInputEditor: FC<ChatInputEditorProps> = ({
  autoFocus,
  caretIndex,
  disabled,
  message,
  mentionContext,
  placeholder,
  className,
  editorRef,
  onChange,
  onCaretChange,
  onKeyDown,
}) => {
  const isComposingRef = useRef(false);
  const hasAutoFocusedRef = useRef(false);
  const mentionSegments = getChatMentionSegments(message, mentionContext);

  const syncEditorScrollToCaret = ({
    editor,
    currentCaretIndex,
  }: {
    editor: HTMLDivElement;
    currentCaretIndex: number;
  }) => {
    const maxScrollLeft = Math.max(0, editor.scrollWidth - editor.clientWidth);

    if (maxScrollLeft === 0) {
      editor.scrollLeft = 0;
      return;
    }

    const selection = editor.ownerDocument.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const selectionRange = selection.getRangeAt(0);

    if (
      !isNodeInsideEditor({
        editor,
        node: selectionRange.startContainer,
      }) ||
      !isNodeInsideEditor({
        editor,
        node: selectionRange.endContainer,
      })
    ) {
      return;
    }

    const caretRange = selectionRange.cloneRange();
    caretRange.collapse(false);

    const caretRect =
      caretRange.getClientRects()[0] ?? caretRange.getBoundingClientRect();

    if (caretRect.width === 0 && caretRect.left === 0 && caretRect.right === 0) {
      if (currentCaretIndex <= 0) {
        editor.scrollLeft = 0;
        return;
      }

      if (currentCaretIndex >= message.length) {
        editor.scrollLeft = maxScrollLeft;
      }

      return;
    }

    const editorRect = editor.getBoundingClientRect();
    const overflowRight =
      caretRect.right - (editorRect.right - CARET_SCROLL_PADDING);
    const overflowLeft =
      editorRect.left + CARET_SCROLL_PADDING - caretRect.left;

    if (overflowRight > 0) {
      editor.scrollLeft = Math.min(
        maxScrollLeft,
        editor.scrollLeft + overflowRight,
      );
      return;
    }

    if (overflowLeft > 0) {
      editor.scrollLeft = Math.max(0, editor.scrollLeft - overflowLeft);
    }
  };

  const syncSelectionOffsets = () => {
    const editor = editorRef.current;

    if (!editor) {
      return null;
    }

    const selectionOffsets = getChatEditorSelectionOffsets(editor);

    if (!selectionOffsets) {
      return null;
    }

    syncEditorScrollToCaret({
      editor,
      currentCaretIndex: selectionOffsets.end,
    });
    onCaretChange(selectionOffsets.end);
    return selectionOffsets;
  };

  const syncMessageFromDom = () => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const rawMessage = editor.textContent ?? "";
    const selectionOffsets = getChatEditorSelectionOffsets(editor) ?? {
      start: rawMessage.length,
      end: rawMessage.length,
    };
    const normalizedMessage = normalizeChatEditorText(rawMessage);
    const normalizedCaretIndex = Math.min(
      normalizeChatEditorText(rawMessage.slice(0, selectionOffsets.end)).length,
      normalizedMessage.length,
    );

    onChange(normalizedMessage, normalizedCaretIndex);
  };

  const replaceSelection = ({
    selectionStart,
    selectionEnd,
    insertedText,
  }: {
    selectionStart: number;
    selectionEnd: number;
    insertedText: string;
  }) => {
    const availableLength =
      CHAT_EDITOR_MAX_LENGTH -
      (message.length - (selectionEnd - selectionStart));
    const normalizedInsertedText = normalizeChatEditorText(
      insertedText,
      Math.max(0, availableLength),
    );
    const nextMessage = `${message.slice(0, selectionStart)}${normalizedInsertedText}${message.slice(selectionEnd)}`;
    const nextCaretIndex = selectionStart + normalizedInsertedText.length;

    onChange(nextMessage, nextCaretIndex);
  };

  useEffect(() => {
    if (!autoFocus || disabled || hasAutoFocusedRef.current) {
      return;
    }

    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    editor.focus();
    restoreChatEditorSelection({
      root: editor,
      start: message.length,
    });
    syncEditorScrollToCaret({
      editor,
      currentCaretIndex: message.length,
    });
    onCaretChange(message.length);
    hasAutoFocusedRef.current = true;
  }, [autoFocus, disabled, editorRef, message.length, onCaretChange]);

  useEffect(() => {
    const handleSelectionChange = () => {
      syncSelectionOffsets();
    };

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [editorRef, onCaretChange]);

  useLayoutEffect(() => {
    const editor = editorRef.current;

    if (
      !editor ||
      document.activeElement !== editor ||
      isComposingRef.current
    ) {
      return;
    }

    restoreChatEditorSelection({
      root: editor,
      start: caretIndex,
    });
    syncEditorScrollToCaret({
      editor,
      currentCaretIndex: caretIndex,
    });
  }, [caretIndex, editorRef, message]);

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.preventDefault();

    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const selectionOffsets = getChatEditorSelectionOffsets(editor) ?? {
      start: message.length,
      end: message.length,
    };
    const pastedText = normalizeChatEditorText(
      event.clipboardData.getData("text/plain"),
      CHAT_EDITOR_MAX_LENGTH,
    );
    replaceSelection({
      selectionStart: selectionOffsets.start,
      selectionEnd: selectionOffsets.end,
      insertedText: pastedText,
    });
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onKeyDown?.(event);

    if (event.defaultPrevented || disabled || isComposingRef.current) {
      return;
    }

    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const selectionOffsets = getChatEditorSelectionOffsets(editor) ?? {
      start: message.length,
      end: message.length,
    };

    if (
      event.key.length === 1 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      replaceSelection({
        selectionStart: selectionOffsets.start,
        selectionEnd: selectionOffsets.end,
        insertedText: event.key,
      });
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();

      if (selectionOffsets.start !== selectionOffsets.end) {
        replaceSelection({
          selectionStart: selectionOffsets.start,
          selectionEnd: selectionOffsets.end,
          insertedText: "",
        });
        return;
      }

      if (selectionOffsets.start === 0) {
        return;
      }

      replaceSelection({
        selectionStart: selectionOffsets.start - 1,
        selectionEnd: selectionOffsets.end,
        insertedText: "",
      });
      return;
    }

    if (event.key === "Delete") {
      event.preventDefault();

      if (selectionOffsets.start !== selectionOffsets.end) {
        replaceSelection({
          selectionStart: selectionOffsets.start,
          selectionEnd: selectionOffsets.end,
          insertedText: "",
        });
        return;
      }

      if (selectionOffsets.end >= message.length) {
        return;
      }

      replaceSelection({
        selectionStart: selectionOffsets.start,
        selectionEnd: selectionOffsets.end + 1,
        insertedText: "",
      });
    }
  };

  return (
    <div
      className={cn(
        "ll:relative ll:h-full ll:w-full ll:min-w-0 ll:box-border",
        className,
      )}
    >
      {!message && (
        <span
          aria-hidden
          className="ll:pointer-events-none ll:absolute ll:left-1 ll:top-1 ll:text-xs ll:leading-[14px] ll:text-gray-500"
        >
          {placeholder}
        </span>
      )}
      <div
        ref={editorRef}
        role="textbox"
        aria-label={placeholder}
        aria-multiline="false"
        contentEditable={!disabled}
        suppressContentEditableWarning
        spellCheck={false}
        tabIndex={disabled ? -1 : 0}
        data-slot="chat-input"
        className={cn(
          "ll:box-border ll:block ll:h-full ll:w-full ll:min-w-0 ll:overflow-x-hidden ll:overflow-y-hidden ll:px-1 ll:py-1 ll:text-xs ll:leading-[14px] ll:text-white ll:outline-none ll:whitespace-pre",
          disabled && "ll:cursor-not-allowed ll:opacity-50",
        )}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        onFocus={() => {
          syncSelectionOffsets();
        }}
        onInput={(event: FormEvent<HTMLDivElement>) => {
          const nativeInputEvent = event.nativeEvent as InputEvent;

          nativeInputEvent.stopPropagation();

          if (isComposingRef.current) {
            return;
          }

          syncMessageFromDom();
        }}
        onKeyDown={handleEditorKeyDown}
        onKeyUp={(event) => {
          event.stopPropagation();
          syncSelectionOffsets();
        }}
        onMouseUp={() => {
          syncSelectionOffsets();
        }}
        onPaste={handlePaste}
        onBeforeInput={(event: FormEvent<HTMLDivElement>) => {
          const nativeInputEvent = event.nativeEvent as InputEvent;

          nativeInputEvent.stopPropagation();

          if (
            nativeInputEvent.inputType === "insertParagraph" ||
            nativeInputEvent.inputType === "insertLineBreak"
          ) {
            event.preventDefault();
          }
        }}
        onCompositionStart={() => {
          isComposingRef.current = true;
        }}
        onCompositionEnd={() => {
          isComposingRef.current = false;
          syncMessageFromDom();
        }}
      >
        <ChatMentionText segments={mentionSegments} plainTextAsTextNode />
      </div>
    </div>
  );
};

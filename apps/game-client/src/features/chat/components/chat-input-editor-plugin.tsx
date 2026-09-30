import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  CHAT_INPUT_PROGRAMMATIC_UPDATE_TAG,
  $getChatInputSelectionOffsets,
  $replaceChatInputText,
  $selectChatInputRange,
  setChatInputEditorValue,
} from "@/features/chat/chat-input-editor.helpers";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
} from "lexical";
import { useEffect, useRef, type FC } from "react";

type ChatInputEditorPluginProps = {
  caretIndex: number;
  disabled?: boolean;
  /** A prefix of the entry that the editor does not show, such as `!`. */
  hiddenPrefix?: string;
  message: string;
  onChange: (message: string, caretIndex: number) => void;
  onCaretChange: (caretIndex: number) => void;
  /** Takes over Backspace, with any modifier, when the caret is at the start. */
  onBackspaceAtStart?: () => void;
};

const deletePreviousWord = () => {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return;
  }

  if (!selection.isCollapsed()) {
    selection.removeText();

    return;
  }

  const root = $getRoot();
  const message = root.getTextContent();
  const caretIndex = $getChatInputSelectionOffsets(selection)[1];
  const prefix = message.slice(0, caretIndex);
  const deletionMatch = prefix.match(/\S+\s*$/u) ?? prefix.match(/\s+$/u);

  if (!deletionMatch) {
    return;
  }

  const deletionStart = caretIndex - deletionMatch[0].length;
  $selectChatInputRange(deletionStart, caretIndex);
  const deletionSelection = $getSelection();

  if ($isRangeSelection(deletionSelection)) {
    deletionSelection.removeText();
  }
};

export const ChatInputEditorPlugin: FC<ChatInputEditorPluginProps> = ({
  caretIndex,
  disabled,
  hiddenPrefix = "",
  message,
  onChange,
  onCaretChange,
  onBackspaceAtStart,
}) => {
  const [editor] = useLexicalComposerContext();
  const previousTextRef = useRef(message);

  useEffect(() => {
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    const editorText = editor
      .getEditorState()
      .read(() => $getRoot().getTextContent());

    if (editorText === message) {
      return;
    }

    previousTextRef.current = message;

    // The player just completed the prefix, so the text left of `message`
    // is the typed prefix, which the editor now hides. The caret stays where
    // the typing left it, and the history starts here because undo would
    // bring the prefix back as visible text.
    const movedLength = editorText.length - message.length;

    if (
      movedLength > 0 &&
      editorText.endsWith(message) &&
      hiddenPrefix.endsWith(editorText.slice(0, movedLength))
    ) {
      editor.update(
        () => {
          const selection = $getSelection();

          const editorCaretIndex = $isRangeSelection(selection)
            ? $getChatInputSelectionOffsets(selection)[1]
            : editorText.length;

          $replaceChatInputText({
            caretIndex: Math.max(0, editorCaretIndex - movedLength),
            message,
          });
        },
        { tag: CHAT_INPUT_PROGRAMMATIC_UPDATE_TAG },
      );
      editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);

      return;
    }

    setChatInputEditorValue({
      caretIndex,
      editor,
      message,
    });
  }, [caretIndex, editor, hiddenPrefix, message]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState, tags }) => {
      editorState.read(() => {
        const nextMessage = $getRoot().getTextContent();
        const selection = $getSelection();

        const nextCaretIndex = $isRangeSelection(selection)
          ? $getChatInputSelectionOffsets(selection)[1]
          : nextMessage.length;

        if (
          nextMessage !== previousTextRef.current &&
          !tags.has(CHAT_INPUT_PROGRAMMATIC_UPDATE_TAG)
        ) {
          previousTextRef.current = nextMessage;
          onChange(nextMessage, nextCaretIndex);

          return;
        }

        previousTextRef.current = nextMessage;
        onCaretChange(nextCaretIndex);
      });
    });
  }, [editor, onCaretChange, onChange]);

  useEffect(() => {
    if (!onBackspaceAtStart) return;

    // Lexical routes Backspace and its word/line variants through this
    // command, so claiming it here stops every deletion at the start.
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        const selection = $getSelection();

        if (
          event.key !== "Backspace" ||
          !$isRangeSelection(selection) ||
          !selection.isCollapsed() ||
          $getChatInputSelectionOffsets(selection)[1] !== 0
        ) {
          return false;
        }

        event.preventDefault();
        onBackspaceAtStart();

        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, onBackspaceAtStart]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "Backspace" ||
        !event.ctrlKey ||
        event.altKey ||
        event.metaKey
      ) {
        return;
      }

      event.preventDefault();
      editor.update(deletePreviousWord);
    };

    const unregisterRootListener = editor.registerRootListener(
      (rootElement, previousRootElement) => {
        previousRootElement?.removeEventListener("keydown", handleKeyDown);
        rootElement?.addEventListener("keydown", handleKeyDown);
      },
    );

    return () => {
      unregisterRootListener();
    };
  }, [editor]);

  return null;
};

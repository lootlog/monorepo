import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  CHAT_INPUT_PROGRAMMATIC_UPDATE_TAG,
  $getChatInputSelectionOffsets,
  $selectChatInputRange,
  setChatInputEditorValue,
} from "@/features/chat/chat-input-editor.helpers";
import { $getRoot, $getSelection, $isRangeSelection } from "lexical";
import { useEffect, useRef, type FC } from "react";
import { addMeasuredEventListener } from "@/lib/performance-monitoring/measured-callback";

type ChatInputEditorPluginProps = {
  caretIndex: number;
  disabled?: boolean;
  message: string;
  onChange: (message: string, caretIndex: number) => void;
  onCaretChange: (caretIndex: number) => void;
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
  message,
  onChange,
  onCaretChange,
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
    setChatInputEditorValue({
      caretIndex,
      editor,
      message,
    });
  }, [caretIndex, editor, message]);

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
    let removeRootKeyDown: () => void = () => undefined;
    const unregisterRootListener = editor.registerRootListener(
      (rootElement) => {
        removeRootKeyDown();
        removeRootKeyDown = rootElement
          ? addMeasuredEventListener(
              rootElement,
              "keydown",
              handleKeyDown,
              "chat.input-editor.keydown",
            )
          : () => undefined;
      },
    );

    return () => {
      removeRootKeyDown();
      unregisterRootListener();
    };
  }, [editor]);

  return null;
};

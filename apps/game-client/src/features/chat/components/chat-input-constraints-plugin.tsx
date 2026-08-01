import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $getChatInputSelectionOffsets,
  $selectChatInputRange,
} from "@/features/chat/chat-input-editor.helpers";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  PASTE_COMMAND,
} from "lexical";
import { useEffect, type FC } from "react";
import { addMeasuredEventListener } from "@/lib/performance-monitoring/measured-callback";

export const CHAT_INPUT_MAX_LENGTH = 120;

export const normalizeChatInputText = (
  text: string,
  maxLength = CHAT_INPUT_MAX_LENGTH,
) => {
  return text
    .replace(/\r\n?|\n/gu, " ")
    .replace(/\u00a0/gu, " ")
    .slice(0, maxLength);
};

const getAvailableLength = () => {
  const root = $getRoot();
  const selection = $getSelection();
  const selectionOffsets = $isRangeSelection(selection)
    ? $getChatInputSelectionOffsets(selection)
    : [root.getTextContentSize(), root.getTextContentSize()];
  const selectedLength = Math.abs(selectionOffsets[0] - selectionOffsets[1]);

  return Math.max(
    0,
    CHAT_INPUT_MAX_LENGTH - (root.getTextContentSize() - selectedLength),
  );
};

const insertConstrainedText = (text: string) => {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return false;
  }

  const insertedText = normalizeChatInputText(text, getAvailableLength());

  if (insertedText) {
    selection.insertText(insertedText);
  }

  return true;
};

export const ChatInputConstraintsPlugin: FC = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        INSERT_LINE_BREAK_COMMAND,
        () => true,
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        INSERT_PARAGRAPH_COMMAND,
        () => true,
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          const clipboardData =
            "clipboardData" in event ? event.clipboardData : null;

          if (!clipboardData) {
            return false;
          }

          event.preventDefault();
          return insertConstrainedText(clipboardData.getData("text/plain"));
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        CONTROLLED_TEXT_INSERTION_COMMAND,
        (eventOrText) => {
          if (typeof eventOrText !== "string") {
            return false;
          }

          return insertConstrainedText(eventOrText);
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      const messageLength = editorState.read(() =>
        $getRoot().getTextContentSize(),
      );

      if (messageLength <= CHAT_INPUT_MAX_LENGTH || editor.isComposing()) {
        return;
      }

      editor.update(() => {
        $selectChatInputRange(CHAT_INPUT_MAX_LENGTH, messageLength);
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          selection.removeText();
        }
      });
    });
  }, [editor]);

  useEffect(() => {
    const stopKeyPressPropagation = (event: KeyboardEvent) => {
      event.stopPropagation();
    };

    const handleBeforeInput = (event: InputEvent) => {
      if (
        event.inputType === "insertParagraph" ||
        event.inputType === "insertLineBreak"
      ) {
        event.preventDefault();
        return;
      }

      if (
        event.inputType !== "insertText" ||
        event.data === null ||
        event.isComposing
      ) {
        return;
      }

      const availableLength = editor.getEditorState().read(getAvailableLength);

      if (event.data.length <= availableLength) {
        return;
      }

      event.preventDefault();
      editor.update(() => {
        insertConstrainedText(event.data ?? "");
      });
    };

    let removeKeyPress: () => void = () => undefined;
    let removeBeforeInput: () => void = () => undefined;
    const unregisterRootListener = editor.registerRootListener(
      (rootElement) => {
        removeKeyPress();
        removeBeforeInput();
        if (!rootElement) return;

        removeKeyPress = addMeasuredEventListener(
          rootElement,
          "keypress",
          stopKeyPressPropagation,
          "chat.input-constraints.keypress",
        );
        removeBeforeInput = addMeasuredEventListener(
          rootElement,
          "beforeinput",
          handleBeforeInput,
          "chat.input-constraints.beforeinput",
          true,
        );
      },
    );

    return () => {
      removeKeyPress();
      removeBeforeInput();
      unregisterRootListener();
    };
  }, [editor]);

  return null;
};

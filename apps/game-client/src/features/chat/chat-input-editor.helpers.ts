import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $setSelection,
  type LexicalNode,
  type LexicalEditor,
  type PointType,
  type RangeSelection,
} from "lexical";

export const CHAT_INPUT_PROGRAMMATIC_UPDATE_TAG =
  "chat-input-programmatic-update";

const $getChatInputPointOffset = (point: PointType) => {
  const pointNode = point.getNode();
  let currentNode: LexicalNode = pointNode;
  let offset = 0;
  let parent = currentNode.getParent();

  while (parent) {
    for (const sibling of parent.getChildren()) {
      if (sibling.is(currentNode)) {
        break;
      }

      offset += sibling.getTextContentSize();
    }

    currentNode = parent;
    parent = currentNode.getParent();
  }

  if (point.type === "text") {
    return offset + point.offset;
  }

  if ($isElementNode(pointNode)) {
    for (const child of pointNode.getChildren().slice(0, point.offset)) {
      offset += child.getTextContentSize();
    }
  }

  return offset;
};

export const $getChatInputSelectionOffsets = (
  selection: RangeSelection,
): [number, number] => {
  return [
    $getChatInputPointOffset(selection.anchor),
    $getChatInputPointOffset(selection.focus),
  ];
};

const $getChatInputTextPoint = (requestedOffset: number) => {
  const root = $getRoot();
  const targetOffset = Math.max(
    0,
    Math.min(requestedOffset, root.getTextContentSize()),
  );
  let traversedLength = 0;

  for (const textNode of root.getAllTextNodes()) {
    const nodeLength = textNode.getTextContentSize();

    if (targetOffset <= traversedLength + nodeLength) {
      return {
        key: textNode.getKey(),
        offset: targetOffset - traversedLength,
      };
    }

    traversedLength += nodeLength;
  }

  return null;
};

export const $selectChatInputRange = (start: number, end = start) => {
  const startPoint = $getChatInputTextPoint(start);
  const endPoint = $getChatInputTextPoint(end);

  if (!startPoint || !endPoint) {
    $getRoot().selectEnd();
    return;
  }

  const selection = $createRangeSelection();
  selection.anchor.set(startPoint.key, startPoint.offset, "text");
  selection.focus.set(endPoint.key, endPoint.offset, "text");
  $setSelection(selection);
};

export const $selectChatInputOffset = (requestedOffset: number) => {
  $selectChatInputRange(requestedOffset);
};

export const $replaceChatInputText = ({
  caretIndex,
  message,
}: {
  caretIndex: number;
  message: string;
}) => {
  const root = $getRoot();
  const paragraph = $createParagraphNode();

  if (message) {
    paragraph.append($createTextNode(message));
  }

  root.clear().append(paragraph);
  $selectChatInputOffset(caretIndex);
};

export const setChatInputEditorValue = ({
  caretIndex,
  editor,
  message,
}: {
  caretIndex: number;
  editor: LexicalEditor;
  message: string;
}) => {
  editor.update(
    () => {
      $replaceChatInputText({
        caretIndex,
        message,
      });
    },
    { tag: CHAT_INPUT_PROGRAMMATIC_UPDATE_TAG },
  );
};

export const focusChatInputEditor = ({
  caretIndex,
  editor,
}: {
  caretIndex: number;
  editor: LexicalEditor;
}) => {
  editor.focus(() => {
    editor.update(() => {
      $selectChatInputOffset(caretIndex);
    });
  });
};

export const CHAT_EDITOR_MAX_LENGTH = 120;

const CHAT_EDITOR_LINE_BREAK_PATTERN = /[\r\n]+/g;

const clampChatEditorOffset = (value: number, textLength: number) => {
  return Math.max(0, Math.min(value, textLength));
};

export const normalizeChatEditorText = (
  value: string,
  maxLength = CHAT_EDITOR_MAX_LENGTH,
) => {
  return value
    .replace(/\u00a0/g, " ")
    .replace(CHAT_EDITOR_LINE_BREAK_PATTERN, " ")
    .slice(0, maxLength);
};

const getTextContentLength = (root: HTMLElement) => {
  return root.textContent?.length ?? 0;
};

const getTextOffsetFromPosition = ({
  root,
  node,
  offset,
}: {
  root: HTMLElement;
  node: Node;
  offset: number;
}) => {
  const range = root.ownerDocument.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);

  return range.toString().length;
};

const getTextNodePositionForOffset = ({
  root,
  offset,
}: {
  root: HTMLElement;
  offset: number;
}) => {
  const textLength = getTextContentLength(root);
  const clampedOffset = clampChatEditorOffset(offset, textLength);
  const treeWalker = root.ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
  );
  let currentNode = treeWalker.nextNode();
  let traversedCharacters = 0;

  while (currentNode) {
    const currentNodeTextLength = currentNode.textContent?.length ?? 0;
    const nodeEndOffset = traversedCharacters + currentNodeTextLength;

    if (clampedOffset <= nodeEndOffset) {
      return {
        node: currentNode,
        offset: clampedOffset - traversedCharacters,
      };
    }

    traversedCharacters = nodeEndOffset;
    currentNode = treeWalker.nextNode();
  }

  return {
    node: root,
    offset: root.childNodes.length,
  };
};

const isSelectionInsideRoot = ({
  root,
  node,
}: {
  root: HTMLElement;
  node: Node | null;
}) => {
  if (!node) {
    return false;
  }

  return node === root || root.contains(node);
};

export const getChatEditorSelectionOffsets = (root: HTMLElement) => {
  const selection = root.ownerDocument.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (
    !isSelectionInsideRoot({ root, node: range.startContainer }) ||
    !isSelectionInsideRoot({ root, node: range.endContainer })
  ) {
    return null;
  }

  return {
    start: getTextOffsetFromPosition({
      root,
      node: range.startContainer,
      offset: range.startOffset,
    }),
    end: getTextOffsetFromPosition({
      root,
      node: range.endContainer,
      offset: range.endOffset,
    }),
  };
};

export const restoreChatEditorSelection = ({
  root,
  start,
  end = start,
}: {
  root: HTMLElement;
  start: number;
  end?: number;
}) => {
  const selection = root.ownerDocument.getSelection();

  if (!selection) {
    return;
  }

  const startPosition = getTextNodePositionForOffset({ root, offset: start });
  const endPosition = getTextNodePositionForOffset({ root, offset: end });
  const range = root.ownerDocument.createRange();

  range.setStart(startPosition.node, startPosition.offset);
  range.setEnd(endPosition.node, endPosition.offset);

  selection.removeAllRanges();
  selection.addRange(range);
};

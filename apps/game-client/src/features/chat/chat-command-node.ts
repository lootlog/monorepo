import {
  $applyNodeReplacement,
  TextNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
} from "lexical";
import {
  CHAT_COMMAND_COLOR_KEYS,
  type ChatCommandPrefixKind,
} from "@/features/chat/chat-command-prefix";
import { getBackgroundColor } from "@/utils/notifications-and-detector/background";

export type SerializedChatCommandNode = Spread<
  {
    hint: string | null;
    kind: ChatCommandPrefixKind;
    type: "chat-command";
    version: 1;
  },
  SerializedTextNode
>;

const HINT_CLASS_NAME = "ll-chat-command-hint";

const applyCommandStyle = (
  element: HTMLElement,
  kind: ChatCommandPrefixKind,
  hint: string | null,
) => {
  element.dataset.chatCommand = kind;
  element.style.backgroundColor = getBackgroundColor(
    CHAT_COMMAND_COLOR_KEYS[kind],
    true,
  );
  element.style.color = "white";
  element.style.borderRadius = "3px";
  element.style.fontWeight = "600";
  element.style.padding = "1px 3px";
  element.style.position = "relative";

  // While the command has no argument yet, the stylesheet shows the hint
  // after it; see `.ll-chat-command-hint` in index.css.
  if (hint) {
    element.dataset.chatCommandHint = hint;
    element.classList.add(HINT_CLASS_NAME);
  } else {
    delete element.dataset.chatCommandHint;
    element.classList.remove(HINT_CLASS_NAME);
  }
};

/**
 * The leading `/grp` or `!` of a composer entry, drawn as a chip so the player
 * sees what Enter will do. It is atomic like a mention: Backspace removes the
 * whole prefix, and the text serializes unchanged.
 */
export class ChatCommandNode extends TextNode {
  __kind: ChatCommandPrefixKind;
  __hint: string | null;

  static getType() {
    return "chat-command";
  }

  static clone(node: ChatCommandNode) {
    return new ChatCommandNode(
      node.__text,
      node.__kind,
      node.__hint,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedChatCommandNode) {
    return $createChatCommandNode({
      hint: serializedNode.hint,
      kind: serializedNode.kind,
      text: serializedNode.text,
    }).updateFromJSON(serializedNode);
  }

  constructor(
    text: string,
    kind: ChatCommandPrefixKind,
    hint: string | null,
    key?: NodeKey,
  ) {
    super(text, key);
    this.__kind = kind;
    this.__hint = hint;
  }

  createDOM(config: EditorConfig) {
    const element = super.createDOM(config);
    applyCommandStyle(element, this.__kind, this.__hint);

    return element;
  }

  updateDOM(previousNode: this, element: HTMLElement, config: EditorConfig) {
    const shouldReplace = super.updateDOM(previousNode, element, config);
    applyCommandStyle(element, this.__kind, this.__hint);

    return shouldReplace;
  }

  exportJSON(): SerializedChatCommandNode {
    return {
      ...super.exportJSON(),
      hint: this.__hint,
      kind: this.__kind,
      type: "chat-command",
      version: 1,
    };
  }

  canInsertTextBefore() {
    return false;
  }

  canInsertTextAfter() {
    return false;
  }

  isTextEntity() {
    return true;
  }
}

export const $createChatCommandNode = ({
  hint,
  kind,
  text,
}: {
  hint: string | null;
  kind: ChatCommandPrefixKind;
  text: string;
}) => {
  return $applyNodeReplacement(new ChatCommandNode(text, kind, hint)).setMode(
    "token",
  );
};

export const $isChatCommandNode = (
  node: LexicalNode | null | undefined,
): node is ChatCommandNode => {
  return node instanceof ChatCommandNode;
};

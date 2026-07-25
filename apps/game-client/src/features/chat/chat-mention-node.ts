import {
  $applyNodeReplacement,
  TextNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
} from "lexical";

export type ChatMentionKind = "member" | "role";

export type SerializedChatMentionNode = Spread<
  {
    color: string | null;
    identifier: string;
    kind: ChatMentionKind;
    type: "chat-mention";
    version: 1;
  },
  SerializedTextNode
>;

export class ChatMentionNode extends TextNode {
  __kind: ChatMentionKind;
  __identifier: string;
  __color: string | null;

  static getType() {
    return "chat-mention";
  }

  static clone(node: ChatMentionNode) {
    return new ChatMentionNode(
      node.__text,
      node.__kind,
      node.__identifier,
      node.__color,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedChatMentionNode) {
    return $createChatMentionNode({
      color: serializedNode.color,
      identifier: serializedNode.identifier,
      kind: serializedNode.kind,
      label: serializedNode.text,
    }).updateFromJSON(serializedNode);
  }

  constructor(
    label: string,
    kind: ChatMentionKind,
    identifier: string,
    color: string | null,
    key?: NodeKey,
  ) {
    super(label, key);
    this.__kind = kind;
    this.__identifier = identifier;
    this.__color = color;
  }

  createDOM(config: EditorConfig) {
    const element = super.createDOM(config);

    element.dataset.chatMention = this.__identifier;
    element.dataset.chatMentionKind = this.__kind;
    element.style.color = this.__color ? `#${this.__color}` : "";

    return element;
  }

  updateDOM(previousNode: this, element: HTMLElement, config: EditorConfig) {
    const shouldReplace = super.updateDOM(previousNode, element, config);

    element.dataset.chatMention = this.__identifier;
    element.dataset.chatMentionKind = this.__kind;
    element.style.color = this.__color ? `#${this.__color}` : "";

    return shouldReplace;
  }

  exportJSON(): SerializedChatMentionNode {
    return {
      ...super.exportJSON(),
      color: this.__color,
      identifier: this.__identifier,
      kind: this.__kind,
      type: "chat-mention",
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

export const $createChatMentionNode = ({
  color,
  identifier,
  kind,
  label,
}: {
  color: string | null;
  identifier: string;
  kind: ChatMentionKind;
  label: string;
}) => {
  return $applyNodeReplacement(
    new ChatMentionNode(label, kind, identifier, color),
  ).setMode("token");
};

export const $isChatMentionNode = (
  node: LexicalNode | null | undefined,
): node is ChatMentionNode => {
  return node instanceof ChatMentionNode;
};

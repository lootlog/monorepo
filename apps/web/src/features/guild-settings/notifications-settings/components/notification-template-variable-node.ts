import {
  TextNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
} from "lexical";

export type SerializedNotificationTemplateVariableNode = Spread<
  {
    templateKey: string;
    type: "notification-template-variable";
    version: 1;
  },
  SerializedTextNode
>;

export class NotificationTemplateVariableNode extends TextNode {
  __templateKey: string;

  static getType() {
    return "notification-template-variable";
  }

  static clone(node: NotificationTemplateVariableNode) {
    const clone = new NotificationTemplateVariableNode(
      node.__templateKey,
      node.__key,
    );
    clone.__format = node.__format;
    clone.__style = node.__style;
    clone.__mode = node.__mode;
    clone.__detail = node.__detail;
    return clone;
  }

  static importJSON(
    serializedNode: SerializedNotificationTemplateVariableNode,
  ) {
    return new NotificationTemplateVariableNode(
      serializedNode.templateKey,
    ).updateFromJSON(serializedNode);
  }

  constructor(templateKey: string, key?: NodeKey) {
    super(`{{${templateKey}}}`, key);
    this.__templateKey = templateKey;
  }

  createDOM(config: EditorConfig) {
    const element = super.createDOM(config);
    this.applyVariableStyles(element);
    return element;
  }

  updateDOM(
    prevNode: this,
    dom: HTMLElement,
    config: EditorConfig,
  ) {
    const hasUpdated = super.updateDOM(prevNode, dom, config);

    if (prevNode.__templateKey !== this.__templateKey) {
      this.applyVariableStyles(dom);
    }

    return hasUpdated;
  }

  exportJSON(): SerializedNotificationTemplateVariableNode {
    return {
      ...super.exportJSON(),
      templateKey: this.__templateKey,
      type: "notification-template-variable",
      version: 1,
    };
  }

  updateFromJSON(
    serializedNode: SerializedNotificationTemplateVariableNode,
  ) {
    return super
      .updateFromJSON(serializedNode)
      .setTextContent(`{{${serializedNode.templateKey}}}`)
      .setMode("token");
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

  getTemplateKey() {
    return this.getLatest().__templateKey;
  }

  private applyVariableStyles(element: HTMLElement) {
    element.style.backgroundColor = "color-mix(in oklab, var(--primary) 12%, transparent)";
    element.style.borderRadius = "2px";
    element.style.color = "var(--primary)";
  }
}

export const $createNotificationTemplateVariableNode = (
  templateKey: string,
) => {
  const node = new NotificationTemplateVariableNode(templateKey);
  node.setMode("token");
  node.toggleUnmergeable();
  return node;
};

export const $isNotificationTemplateVariableNode = (
  node: LexicalNode | null | undefined,
): node is NotificationTemplateVariableNode =>
  node instanceof NotificationTemplateVariableNode;

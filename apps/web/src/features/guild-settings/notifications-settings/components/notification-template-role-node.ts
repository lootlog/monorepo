import {
  TextNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
} from "lexical";

export type SerializedNotificationTemplateRoleNode = Spread<
  {
    label: string;
    roleColor: string | null;
    roleId: string;
    type: "notification-template-role";
    version: 1;
  },
  SerializedTextNode
>;

export class NotificationTemplateRoleNode extends TextNode {
  __roleColor: string | null;
  __roleId: string;

  static getType() {
    return "notification-template-role";
  }

  static clone(node: NotificationTemplateRoleNode) {
    const clone = new NotificationTemplateRoleNode(
      node.__roleId,
      node.__text,
      node.__roleColor,
      node.__key,
    );
    clone.__format = node.__format;
    clone.__style = node.__style;
    clone.__mode = node.__mode;
    clone.__detail = node.__detail;
    return clone;
  }

  static importJSON(
    serializedNode: SerializedNotificationTemplateRoleNode,
  ) {
    return new NotificationTemplateRoleNode(
      serializedNode.roleId,
      serializedNode.label,
      serializedNode.roleColor,
    ).updateFromJSON(serializedNode);
  }

  constructor(
    roleId: string,
    label: string,
    roleColor: string | null,
    key?: NodeKey,
  ) {
    super(label, key);
    this.__roleId = roleId;
    this.__roleColor = roleColor;
  }

  createDOM(config: EditorConfig) {
    const element = super.createDOM(config);
    this.applyRoleStyles(element);
    return element;
  }

  updateDOM(
    prevNode: this,
    dom: HTMLElement,
    config: EditorConfig,
  ) {
    const hasUpdated = super.updateDOM(prevNode, dom, config);

    if (
      prevNode.__roleColor !== this.__roleColor ||
      prevNode.__text !== this.__text
    ) {
      this.applyRoleStyles(dom);
    }

    return hasUpdated;
  }

  exportJSON(): SerializedNotificationTemplateRoleNode {
    return {
      ...super.exportJSON(),
      label: this.__text,
      roleColor: this.__roleColor,
      roleId: this.__roleId,
      type: "notification-template-role",
      version: 1,
    };
  }

  updateFromJSON(
    serializedNode: SerializedNotificationTemplateRoleNode,
  ) {
    return super
      .updateFromJSON(serializedNode)
      .setTextContent(serializedNode.label)
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

  getRoleId() {
    return this.getLatest().__roleId;
  }

  private applyRoleStyles(element: HTMLElement) {
    element.style.backgroundColor = this.__roleColor
      ? `${this.__roleColor}22`
      : "color-mix(in oklab, var(--primary) 12%, transparent)";
    element.style.borderRadius = "2px";
    element.style.color = this.__roleColor ?? "var(--primary)";
  }
}

export const $createNotificationTemplateRoleNode = (params: {
  roleColor: string | null;
  roleId: string;
  roleName: string;
}) => {
  const node = new NotificationTemplateRoleNode(
    params.roleId,
    `@${params.roleName}`,
    params.roleColor,
  );
  node.setMode("token");
  node.toggleUnmergeable();
  return node;
};

export const $isNotificationTemplateRoleNode = (
  node: LexicalNode | null | undefined,
): node is NotificationTemplateRoleNode =>
  node instanceof NotificationTemplateRoleNode;

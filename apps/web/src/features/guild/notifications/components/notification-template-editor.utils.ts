import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  type LexicalNode,
} from "lexical";
import type { RoleResponseDtoOutput as GuildRole } from "@/lib/api/generated/main/model";
import { getCustomRoleCssColor } from "@/utils/get-color-from-role";
import {
  $createNotificationTemplateRoleNode,
  $isNotificationTemplateRoleNode,
} from "./notification-template-role-node";
import {
  $createNotificationTemplateVariableNode,
  $isNotificationTemplateVariableNode,
} from "./notification-template-variable-node";

export const createPreviewTemplateValues = (
  t: (key: string) => string,
): Record<string, string> => ({
  ruleName: t("settings.notifications.templateEditor.previewValues.ruleName"),
  npcName: t("settings.notifications.templateEditor.previewValues.npcName"),
  npcId: "101",
  world: t("settings.notifications.templateEditor.previewValues.world"),
  minSpawnTime: "31.03.2026 20:15",
  maxSpawnTime: "31.03.2026 20:35",
  scheduledFor: "31.03.2026 20:10",
});

export const renderTemplatePreview = (
  template: string,
  values: Record<string, string>,
) =>
  template.replace(
    /\{\{(ruleName|npcName|npcId|world|minSpawnTime|maxSpawnTime|scheduledFor)\}\}/g,
    (
      _match: string,
      placeholder:
        | "ruleName"
        | "npcName"
        | "npcId"
        | "world"
        | "minSpawnTime"
        | "maxSpawnTime"
        | "scheduledFor",
    ) => values[placeholder] ?? "",
  );

export const createTemplateEditorNodes = (
  value: string,
  roles: GuildRole[],
) => {
  const roleById = new Map(roles.map((role) => [role.id, role] as const));
  const lines = value.split("\n");
  const nodes: Array<LexicalNode> = [];
  const tokenPattern =
    /(<@&(\d+)>|@(everyone|here)|\{\{(ruleName|npcName|npcId|world|minSpawnTime|maxSpawnTime|scheduledFor)\}\})/g;

  for (const line of lines) {
    const paragraphNode = $createParagraphNode();
    let lastIndex = 0;

    for (const match of line.matchAll(tokenPattern)) {
      const token = match[0];
      const index = match.index ?? 0;

      if (index > lastIndex) {
        paragraphNode.append($createTextNode(line.slice(lastIndex, index)));
      }

      if (match[2]) {
        const role = roleById.get(match[2]);
        paragraphNode.append(
          $createNotificationTemplateRoleNode({
            roleColor: role ? getCustomRoleCssColor(role.color) : null,
            roleId: match[2],
            roleName: role?.name ?? match[2],
          }),
        );
      } else if (match[3]) {
        paragraphNode.append(
          $createNotificationTemplateRoleNode({
            roleColor: null,
            roleId: match[3],
            roleName: match[3],
          }),
        );
      } else if (match[4]) {
        paragraphNode.append($createNotificationTemplateVariableNode(match[4]));
      } else {
        paragraphNode.append($createTextNode(token));
      }

      lastIndex = index + token.length;
    }

    if (lastIndex < line.length) {
      paragraphNode.append($createTextNode(line.slice(lastIndex)));
    }

    nodes.push(paragraphNode);
  }

  return nodes;
};

export const serializeTemplateEditorValue = () =>
  $getRoot()
    .getChildren()
    .map((paragraphNode) => {
      if (!$isElementNode(paragraphNode)) {
        return paragraphNode.getTextContent();
      }

      return paragraphNode
        .getChildren()
        .map((childNode: LexicalNode) => {
          if ($isNotificationTemplateRoleNode(childNode)) {
            const roleId = childNode.getRoleId();
            if (roleId === "everyone" || roleId === "here") {
              return `@${roleId}`;
            }
            return `<@&${roleId}>`;
          }

          if ($isNotificationTemplateVariableNode(childNode)) {
            return `{{${childNode.getTemplateKey()}}}`;
          }

          return childNode.getTextContent();
        })
        .join("");
    })
    .join("\n");

const $isTemplateTokenNode = (node: LexicalNode | null | undefined) =>
  $isNotificationTemplateRoleNode(node) ||
  $isNotificationTemplateVariableNode(node);

export const removeTemplateTokenNode = (tokenNode: LexicalNode) => {
  const previousSibling = tokenNode.getPreviousSibling();
  const nextSibling = tokenNode.getNextSibling();
  const parentNode = tokenNode.getParent();

  tokenNode.remove();

  if ($isTextNode(previousSibling)) {
    previousSibling.selectEnd();
    return;
  }

  if ($isTextNode(nextSibling)) {
    nextSibling.selectStart();
    return;
  }

  if ($isElementNode(parentNode)) {
    const selectionIndex = previousSibling
      ? previousSibling.getIndexWithinParent() + 1
      : 0;

    parentNode.select(selectionIndex, selectionIndex);
    return;
  }

  $getRoot().selectEnd();
};

export const getBackspaceTemplateTokenNode = () => {
  const selection = $getSelection();

  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }

  const anchorNode = selection.anchor.getNode();

  if ($isTemplateTokenNode(anchorNode)) {
    return anchorNode;
  }

  if ($isTextNode(anchorNode)) {
    if (selection.anchor.offset !== 0) {
      return null;
    }

    const previousSibling = anchorNode.getPreviousSibling();
    return $isTemplateTokenNode(previousSibling) ? previousSibling : null;
  }

  if ($isElementNode(anchorNode)) {
    const previousChild = anchorNode.getChildAtIndex(
      selection.anchor.offset - 1,
    );
    return $isTemplateTokenNode(previousChild) ? previousChild : null;
  }

  return null;
};

export const SCHEDULED_MESSAGE_VARIABLE_KEYS = new Set([
  "ruleName",
  "scheduledFor",
]);

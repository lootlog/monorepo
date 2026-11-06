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
import {
  CreateNotificationRuleDtoTriggerType as NotificationTriggerType,
  type CreateNotificationRuleDtoTriggerType,
  type RoleResponseDtoOutput as GuildRole,
} from "@lootlog/client/main";
import { getCustomRoleCssColor } from "@/utils/get-color-from-role";
import {
  $createNotificationTemplateRoleNode,
  $isNotificationTemplateRoleNode,
} from "./notification-template-role-node";
import {
  $createNotificationTemplateVariableNode,
  $isNotificationTemplateVariableNode,
} from "./notification-template-variable-node";

/** The `{{variable}}` placeholders the API renders, by the rule triggers that fill them. */
const TIMER_VARIABLE_KEYS = [
  "ruleName",
  "npcName",
  "npcId",
  "world",
  "minSpawnTime",
  "maxSpawnTime",
  "scheduledFor",
] as const;

const SCHEDULED_MESSAGE_VARIABLE_KEYS = new Set(["ruleName", "scheduledFor"]);

const HERO_SIGHTING_VARIABLE_KEYS = [
  "ruleName",
  "heroName",
  "heroLevel",
  "state",
  "mapName",
  "detectedBy",
  "world",
] as const;

const TEMPLATE_VARIABLE_PATTERN = [
  ...new Set([...TIMER_VARIABLE_KEYS, ...HERO_SIGHTING_VARIABLE_KEYS]),
].join("|");

export const getTemplateVariableKeys = (
  triggerType: CreateNotificationRuleDtoTriggerType | undefined,
): readonly string[] => {
  switch (triggerType) {
    case NotificationTriggerType.SCHEDULED_MESSAGE:
      return [...SCHEDULED_MESSAGE_VARIABLE_KEYS];
    case NotificationTriggerType.HERO_SIGHTED:
      return HERO_SIGHTING_VARIABLE_KEYS;
    default:
      return TIMER_VARIABLE_KEYS;
  }
};

export const createPreviewTemplateValues = (t: (key: string) => string) => ({
  ruleName: t("settings.notifications.templateEditor.previewValues.ruleName"),
  npcName: t("settings.notifications.templateEditor.previewValues.npcName"),
  npcId: "101",
  world: t("settings.notifications.templateEditor.previewValues.world"),
  minSpawnTime: "31.03.2026 20:15",
  maxSpawnTime: "31.03.2026 20:35",
  scheduledFor: "31.03.2026 20:10",
  heroName: t("settings.notifications.templateEditor.previewValues.heroName"),
  heroLevel: t("settings.notifications.templateEditor.previewValues.heroLevel"),
  state: t("settings.notifications.templateEditor.previewValues.state"),
  mapName: t("settings.notifications.templateEditor.previewValues.mapName"),
  detectedBy: t(
    "settings.notifications.templateEditor.previewValues.detectedBy",
  ),
});

export const renderTemplatePreview = (
  template: string,
  values: Record<string, string>,
) =>
  template.replace(
    new RegExp(`\\{\\{(${TEMPLATE_VARIABLE_PATTERN})\\}\\}`, "g"),
    (_match: string, placeholder: string) => values[placeholder] ?? "",
  );

export const createTemplateEditorNodes = (
  value: string,
  roles: GuildRole[],
) => {
  const roleById = new Map(roles.map((role) => [role.id, role] as const));
  const lines = value.split("\n");
  const nodes: Array<LexicalNode> = [];

  const tokenPattern = new RegExp(
    `(<@&(\\d+)>|@(everyone|here)|\\{\\{(${TEMPLATE_VARIABLE_PATTERN})\\}\\})`,
    "g",
  );

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

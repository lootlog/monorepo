import { partition } from "es-toolkit";

type ManualNpcIdsParseResult = {
  ids: string[];
  invalidTokens: string[];
};

const MANUAL_NPC_ID_SPLIT_PATTERN = /[\s,]+/;

/**
 * Form values keep a timer NPC id as its number and a Margonem template id
 * with this prefix: a template selects every spawn of the monster, while a
 * timer id selects one spawn.
 */
const TEMPLATE_NPC_SELECTION_PREFIX = "template:";

const MANUAL_NPC_SELECTION_PATTERN = /^(template:)?(\d+)$/;

export const toNotificationRuleNpcSelection = (npc: {
  id: number;
  identityNamespace?: string;
}) =>
  npc.identityNamespace === "template"
    ? `${TEMPLATE_NPC_SELECTION_PREFIX}${npc.id}`
    : String(npc.id);

const parseNpcSelection = (selection: string) => {
  const isTemplate = selection.startsWith(TEMPLATE_NPC_SELECTION_PREFIX);

  return {
    isTemplate,
    id: Number(
      isTemplate
        ? selection.slice(TEMPLATE_NPC_SELECTION_PREFIX.length)
        : selection,
    ),
  };
};

export const getNotificationRuleNpcSelectionId = (selection: string) =>
  parseNpcSelection(selection).id;

export const parseManualNotificationRuleNpcIds = (
  rawValue: string,
): ManualNpcIdsParseResult => {
  const tokens = rawValue
    .split(MANUAL_NPC_ID_SPLIT_PATTERN)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  const parsedIds: string[] = [];
  const invalidTokens: string[] = [];
  const seenIds = new Set<string>();

  for (const token of tokens) {
    const match = MANUAL_NPC_SELECTION_PATTERN.exec(token);

    if (!match) {
      invalidTokens.push(token);
      continue;
    }

    const numericNpcId = Number(match[2]);

    if (!Number.isSafeInteger(numericNpcId) || numericNpcId <= 0) {
      invalidTokens.push(token);
      continue;
    }

    const normalizedNpcId = `${match[1] ?? ""}${numericNpcId}`;

    if (seenIds.has(normalizedNpcId)) {
      continue;
    }

    seenIds.add(normalizedNpcId);
    parsedIds.push(normalizedNpcId);
  }

  return {
    ids: parsedIds,
    invalidTokens,
  };
};

type GetNotificationRuleNpcIdsInput = {
  manualNpcEntry?: boolean;
  manualNpcIds?: string;
  npcIds?: string[];
};

export const getNotificationRuleNpcIdsForSubmit = ({
  manualNpcEntry,
  manualNpcIds,
  npcIds,
}: GetNotificationRuleNpcIdsInput): string[] => {
  if (manualNpcEntry) {
    return parseManualNotificationRuleNpcIds(manualNpcIds ?? "").ids;
  }

  return Array.from(new Set(npcIds ?? []));
};

export const buildNotificationRuleNpcFilterPayload = (selections: string[]) => {
  const [templates, timers] = partition(
    selections.map(parseNpcSelection),
    (npc) => npc.isTemplate,
  );

  const timerNpcIds = timers.map(({ id }) => id);

  if (templates.length > 0) {
    return {
      npcIds: timerNpcIds,
      npcTemplateIds: templates.map(({ id }) => id),
    };
  }

  if (timerNpcIds.length === 1) {
    return { npcId: timerNpcIds[0] };
  }

  return { npcIds: timerNpcIds };
};

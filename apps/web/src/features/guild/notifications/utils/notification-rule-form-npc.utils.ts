import { partition } from "es-toolkit";
import type { SearchTimersNpcResponseDtoOutput } from "@lootlog/client/main";

type ManualNpcIdsParseResult = {
  ids: string[];
  invalidTokens: string[];
};

const MANUAL_NPC_ID_SPLIT_PATTERN = /[\s,]+/;

const TEMPLATE_NPC_SELECTION_PREFIX = "template:";

const MANUAL_NPC_SELECTION_PATTERN = /^(template:)?(\d+)$/;

type TimerNpcHit = Pick<
  SearchTimersNpcResponseDtoOutput,
  "npcId" | "templateId"
>;

export const toTemplateNpcSelection = (templateId: number) =>
  `${TEMPLATE_NPC_SELECTION_PREFIX}${templateId}`;

export const parseNotificationRuleNpcSelection = (selection: string) => {
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

export const toTimerNpcSearchSelection = (
  timer: TimerNpcHit,
  isAllWorlds: boolean,
) => {
  if (timer.templateId !== null)
    return toTemplateNpcSelection(timer.templateId);

  return isAllWorlds ? null : String(timer.npcId);
};

export const findSelectedTimerNpc = <Timer extends TimerNpcHit>(
  selection: string,
  timers: readonly Timer[],
) => {
  const { isTemplate, id } = parseNotificationRuleNpcSelection(selection);

  return timers.find((timer) =>
    isTemplate ? timer.templateId === id : timer.npcId === id,
  );
};

export const getNotificationRuleNpcLookupParams = (selections: string[]) => {
  const [templates, timers] = partition(
    selections.map(parseNotificationRuleNpcSelection),
    (npc) => npc.isTemplate,
  );

  return {
    npcIds: timers.map(({ id }) => id),
    templateIds: templates.map(({ id }) => id),
  };
};

export const hasTimerNpcSelection = (selections: string[]) =>
  selections.some(
    (selection) => !parseNotificationRuleNpcSelection(selection).isTemplate,
  );

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
  const { npcIds: timerNpcIds, templateIds } =
    getNotificationRuleNpcLookupParams(selections);

  if (templateIds.length > 0) {
    return { npcIds: timerNpcIds, npcTemplateIds: templateIds };
  }

  if (timerNpcIds.length === 1) {
    return { npcId: timerNpcIds[0] };
  }

  return { npcIds: timerNpcIds };
};

import { partition, uniq } from "es-toolkit";
import type { SearchTimersNpcResponseDtoOutput } from "@lootlog/client/main";

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

/**
 * A timer with a known template selects every spawn of its monster. A timer
 * without one can only select its own id, which is offered only for a
 * one-world rule: an all-world rule must not silently narrow to one spawn.
 */
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

/** Timer search parameters that resolve saved selections to their timers. */
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

/**
 * Replaces one saved timer NPC id with `replacement`, or removes it when
 * `replacement` is null. Other selections and their order are kept, and a
 * replacement already selected is not added twice.
 */
export const replaceNotificationRuleNpcSelection = (
  selections: readonly string[],
  selectedId: number,
  replacement: number | null,
) =>
  uniq(
    selections.flatMap((selection) =>
      selection === String(selectedId)
        ? replacement === null
          ? []
          : [String(replacement)]
        : [selection],
    ),
  );

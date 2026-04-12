type ManualNpcIdsParseResult = {
  ids: string[];
  invalidTokens: string[];
};

const MANUAL_NPC_ID_SPLIT_PATTERN = /[\s,]+/;

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
    if (!/^\d+$/.test(token)) {
      invalidTokens.push(token);
      continue;
    }

    const numericNpcId = Number(token);

    if (!Number.isSafeInteger(numericNpcId) || numericNpcId <= 0) {
      invalidTokens.push(token);
      continue;
    }

    const normalizedNpcId = String(numericNpcId);

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

export const buildNotificationRuleNpcFilterPayload = (npcIds: string[]) => {
  const numericNpcIds = npcIds.map((npcId) => Number(npcId));

  if (numericNpcIds.length === 1) {
    return { npcId: numericNpcIds[0] };
  }

  return { npcIds: numericNpcIds };
};

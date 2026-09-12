export type GuildSelection = {
  contextKey: string;
  guildId: string;
};

export const getPreferredGuildId = (
  initialGuildId: string | undefined,
  savedGuildId: string | undefined,
  currentGuildId: string | undefined,
  availableGuildIds: ReadonlySet<string>,
  firstVisibleGuildId: string | undefined,
) => {
  if (initialGuildId && availableGuildIds.has(initialGuildId)) {
    return initialGuildId;
  }

  if (savedGuildId && availableGuildIds.has(savedGuildId)) {
    return savedGuildId;
  }

  if (currentGuildId && availableGuildIds.has(currentGuildId)) {
    return currentGuildId;
  }

  return firstVisibleGuildId ?? "";
};

export const resolveStoredGuildIds = (
  characterId: string,
  guildIdByCharId: Record<string, string>,
  selectedGuildIdsByCharId: Record<string, string[]>,
) => {
  if (!characterId) {
    return { currentGuildId: undefined, savedGuildId: undefined };
  }

  return {
    currentGuildId: guildIdByCharId[characterId],
    savedGuildId: selectedGuildIdsByCharId[characterId]?.[0],
  };
};

export const getSelectedGuildId = (
  selection: GuildSelection | null,
  contextKey: string,
  availableGuildIds: ReadonlySet<string>,
  preferredGuildId: string,
) => {
  if (
    selection?.contextKey === contextKey &&
    availableGuildIds.has(selection.guildId)
  ) {
    return selection.guildId;
  }

  return preferredGuildId;
};

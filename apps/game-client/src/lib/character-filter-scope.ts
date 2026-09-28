import type { RuntimeGameSnapshot } from "@/lib/margonem-runtime/runtime.types";

export const getCharacterFilterScopeKey = (
  game: RuntimeGameSnapshot | null,
  viewedWorld: string | undefined,
): string | null => {
  const parts = [
    game?.world,
    game?.hero.accountId,
    game?.hero.characterId,
    viewedWorld,
  ];

  if (
    parts.some(
      (part) =>
        !part?.trim() ||
        part === "unknown" ||
        part === "undefined" ||
        part === "null",
    )
  ) {
    return null;
  }

  return JSON.stringify(parts);
};

export const getCharacterFilterKey = (
  scopeKey: string,
  settingsKey: string,
): string => JSON.stringify([scopeKey, settingsKey]);

export const migrateCharacterFilters = <Filters>(
  legacyFilters: Record<string, Filters>,
  scopeKey: string,
): Record<string, Filters> =>
  Object.fromEntries(
    Object.entries(legacyFilters).map(([settingsKey, filters]) => [
      getCharacterFilterKey(scopeKey, settingsKey),
      filters,
    ]),
  );

const DEFAULT_REQUIRED_PROFESSIONS = ["w", "p", "h", "m", "b", "t"] as const;

const numericValuePattern = /^[+-]?\d+(?:\.\d+)?$/;

export type ItemStatValue = string | number | boolean | string[];

export type ItemSearchFields = {
  stats: Record<string, ItemStatValue>;
  numericStats: Record<string, number>;
  statsKeys: string[];
  requiredProfessions: string[];
};

const normalizeStatValue = (value: string): string | number | boolean => {
  if (numericValuePattern.test(value)) {
    return Number(value);
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
};

export const createItemSearchFields = (statRaw: string): ItemSearchFields => {
  const stats: Record<string, ItemStatValue> = {};
  const numericStats: Record<string, number> = {};
  const statsKeys: string[] = [];

  for (const statEntry of statRaw.split(";")) {
    const [key, value] = statEntry.split("=");

    if (!key || value === undefined) {
      continue;
    }

    statsKeys.push(key);

    if (key === "reqp") {
      const requiredProfessions = value.split("").filter(Boolean);
      stats[key] = requiredProfessions;
      continue;
    }

    const normalizedValue = normalizeStatValue(value);
    stats[key] = normalizedValue;

    if (typeof normalizedValue === "number") {
      numericStats[key] = normalizedValue;
    }
  }

  const requiredProfessions = Array.isArray(stats["reqp"])
    ? [...stats["reqp"]]
    : [...DEFAULT_REQUIRED_PROFESSIONS];

  return {
    stats,
    numericStats,
    statsKeys,
    requiredProfessions,
  };
};

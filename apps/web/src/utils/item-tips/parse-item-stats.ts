export type ItemStat = {
  key: string;
  value: string | boolean;
};

const parseItemStat = (stat: string): ItemStat => {
  const [rawKey, rawValue] = stat.split("=");

  return {
    key: rawKey ?? "undefined",
    value: rawValue ?? true,
  };
};

export const parseItemStats = (stats: string): ItemStat[] => {
  return stats.split(";").map(parseItemStat);
};

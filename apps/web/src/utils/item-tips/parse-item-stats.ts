export type ItemStat = {
  key: string;
  value: string | boolean;
};

export const parseItemStats = (stats: string): ItemStat[] => {
  return stats.split(";").map((stat) => {
    const [key, value] = stat.split("=");

    return {
      key,
      value: value ? value : true,
    };
  });
};

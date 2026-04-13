export const getItemRarity = (stat: string): string | undefined => {
  if (!stat) return undefined;

  const statsObj = Object.fromEntries(stat.split(";").map((s) => s.split("=")));

  return statsObj["rarity"];
};

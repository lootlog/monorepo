export const getItemRarity = (stat: string): string | undefined => {
  if (!stat) return undefined;

  const statsObj: { [key: string]: string } = {};
  const stats = stat.split(";");

  stats.forEach((stat: string) => {
    const [key, value] = stat.split("=");
    statsObj[key] = value;
  });

  return statsObj["rarity"];
};

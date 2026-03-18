export const PROFESSION_NAMES: Record<string, string> = {
  b: "Tancerz Ostrzy",
  h: "Łowca",
  m: "Mag",
  p: "Paladyn",
  t: "Tropiciel",
  w: "Wojownik",
};

export const PROFESSION_COLORS: Record<string, string> = {
  w: "hsl(0, 72%, 51%)", // red
  p: "hsl(45, 100%, 51%)", // gold
  h: "hsl(142, 61%, 45%)", // green
  b: "hsl(271, 91%, 65%)", // purple
  t: "hsl(24, 90%, 50%)", // orange
  m: "hsl(217, 91%, 60%)", // blue
};

export const getProfessionName = (shortname: string): string => {
  return PROFESSION_NAMES[shortname.toLowerCase()] || shortname;
};

export const getProfessionColor = (shortname: string): string => {
  return PROFESSION_COLORS[shortname.toLowerCase()] || "hsl(var(--chart-1))";
};

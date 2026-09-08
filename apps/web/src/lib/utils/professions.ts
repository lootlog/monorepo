const PROFESSION_NAMES = new Map([
  ["b", "Tancerz Ostrzy"],
  ["h", "Łowca"],
  ["m", "Mag"],
  ["p", "Paladyn"],
  ["t", "Tropiciel"],
  ["w", "Wojownik"],
]);

const PROFESSION_COLORS = new Map([
  ["w", "hsl(0, 72%, 51%)"],
  ["p", "hsl(45, 100%, 51%)"],
  ["h", "hsl(142, 61%, 45%)"],
  ["b", "hsl(271, 91%, 65%)"],
  ["t", "hsl(24, 90%, 50%)"],
  ["m", "hsl(217, 91%, 60%)"],
]);

export const getProfessionName = (shortname: string): string => {
  return PROFESSION_NAMES.get(shortname.toLowerCase()) || shortname;
};

export const getProfessionColor = (shortname: string): string => {
  return (
    PROFESSION_COLORS.get(shortname.toLowerCase()) || "hsl(var(--chart-1))"
  );
};

import type { ProfessionShortname } from "@lootlog/domain/profession";

const PROFESSION_COLORS = new Map<string, string>([
  ["w", "hsl(0, 72%, 51%)"],
  ["p", "hsl(45, 100%, 51%)"],
  ["h", "hsl(142, 61%, 45%)"],
  ["b", "hsl(271, 91%, 65%)"],
  ["t", "hsl(24, 90%, 50%)"],
  ["m", "hsl(217, 91%, 60%)"],
] satisfies [ProfessionShortname, string][]);

export const getProfessionColor = (shortname: string): string => {
  return (
    PROFESSION_COLORS.get(shortname.toLowerCase()) || "hsl(var(--chart-1))"
  );
};

import type { ProfessionEnum } from "@lootlog/schema/loot";

export const PROFESSION_SHORTNAMES = ["w", "p", "h", "m", "b", "t"] as const;

export type ProfessionShortname = (typeof PROFESSION_SHORTNAMES)[number];

const PROFESSION_BY_SHORTNAME = new Map<string, ProfessionEnum>([
  ["b", "BLADE_DANCER"],
  ["h", "HUNTER"],
  ["m", "MAGE"],
  ["p", "PALADIN"],
  ["t", "TRACKER"],
  ["w", "WARRIOR"],
] satisfies [ProfessionShortname, ProfessionEnum][]);

const SHORTNAME_BY_PROFESSION = new Map<string, string>(
  Array.from(PROFESSION_BY_SHORTNAME, ([shortname, profession]) => [
    profession,
    shortname,
  ]),
);

export const getProfByShortname = (
  shortname: string,
): ProfessionEnum | undefined => PROFESSION_BY_SHORTNAME.get(shortname);

export const getShortnameByProf = (profession: string): string | undefined =>
  SHORTNAME_BY_PROFESSION.get(profession);

export const formatLevel = (
  level: number,
  profession?: string | null,
): string => {
  if (!profession) return String(level);

  const shortname =
    getShortnameByProf(profession.toUpperCase()) ??
    profession.charAt(0).toLowerCase();

  return `${level}${shortname}`;
};

import type { ProfessionEnum } from "@lootlog/schema/loot";

const PROFESSION_BY_SHORTNAME = new Map<string, ProfessionEnum>([
  ["b", "BLADE_DANCER"],
  ["h", "HUNTER"],
  ["m", "MAGE"],
  ["p", "PALADIN"],
  ["t", "TRACKER"],
  ["w", "WARRIOR"],
]);

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

/**
 * Formats a level the way Margonem writes it: the level followed by the
 * profession's shortname, for example `300m`. Accepts a profession enum, a
 * shortname, or nothing when the profession is unknown.
 */
export const formatNpcLevel = (
  level: number,
  profession?: string | null,
): string => {
  if (!profession) return String(level);

  const shortname =
    getShortnameByProf(profession.toUpperCase()) ??
    profession.charAt(0).toLowerCase();

  return `${level}${shortname}`;
};

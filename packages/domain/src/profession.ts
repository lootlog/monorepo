import type { ProfessionEnum } from "@lootlog/schema/loot";

const PROFESSION_BY_SHORTNAME = new Map<string, ProfessionEnum>([
  ["b", "BLADE_DANCER"],
  ["h", "HUNTER"],
  ["m", "MAGE"],
  ["p", "PALADIN"],
  ["t", "TRACKER"],
  ["w", "WARRIOR"],
]);

const SHORTNAME_BY_PROFESSION = new Map(
  Array.from(PROFESSION_BY_SHORTNAME, ([shortname, profession]) => [
    profession,
    shortname,
  ]),
);

export const getProfByShortname = (
  shortname: string,
): ProfessionEnum | undefined => PROFESSION_BY_SHORTNAME.get(shortname);

export const getShortnameByProf = (
  profession: ProfessionEnum,
): string | undefined => SHORTNAME_BY_PROFESSION.get(profession);

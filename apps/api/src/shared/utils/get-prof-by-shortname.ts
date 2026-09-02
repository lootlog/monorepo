import {
  ProfessionEnum as Profession,
  type ProfessionEnum as ProfessionValue,
} from "@lootlog/schema/loot";

const PROFESSION_BY_SHORTNAME = {
  b: Profession.BLADE_DANCER,
  h: Profession.HUNTER,
  m: Profession.MAGE,
  p: Profession.PALADIN,
  t: Profession.TRACKER,
  w: Profession.WARRIOR,
};

const SHORTNAME_BY_PROFESSION = Object.fromEntries(
  Object.entries(PROFESSION_BY_SHORTNAME).map(([shortname, profession]) => [
    profession,
    shortname,
  ]),
) as Record<ProfessionValue, string>;

export const getProfByShortname = (shortname: string): ProfessionValue => {
  return PROFESSION_BY_SHORTNAME[shortname];
};

export const getShortnameByProf = (profession: ProfessionValue): string => {
  return SHORTNAME_BY_PROFESSION[profession];
};

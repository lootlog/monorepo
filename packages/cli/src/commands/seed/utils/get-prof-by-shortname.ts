export enum Profession {
  WARRIOR = "WARRIOR",
  PALADIN = "PALADIN",
  HUNTER = "HUNTER",
  MAGE = "MAGE",
  BLADE_DANCER = "BLADE_DANCER",
  TRACKER = "TRACKER",
}

export const PROFESSIONS_SHORTNAMES: Record<string, Profession> = {
  b: Profession.BLADE_DANCER,
  h: Profession.HUNTER,
  m: Profession.MAGE,
  p: Profession.PALADIN,
  t: Profession.TRACKER,
  w: Profession.WARRIOR,
};

export const getProfByShortname = (shortname: string): Profession => {
  return PROFESSIONS_SHORTNAMES[shortname] ?? Profession.WARRIOR;
};

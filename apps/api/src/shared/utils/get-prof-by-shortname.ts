import { Profession } from 'generated/client';

export const PROFESSIONS_SHORTNAMES = {
  b: Profession.BLADE_DANCER,
  h: Profession.HUNTER,
  m: Profession.MAGE,
  p: Profession.PALADIN,
  t: Profession.TRACKER,
  w: Profession.WARRIOR,
};

export const getProfByShortname = (shortname: string): Profession => {
  return PROFESSIONS_SHORTNAMES[shortname];
};

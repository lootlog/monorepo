import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../../prisma/contract.js";

const Profession = prismaDb.nativeEnums.public.Profession.members;
type Profession =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Profession"]["values"][number];

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
) as Record<Profession, string>;

export const getProfByShortname = (shortname: string): Profession => {
  return PROFESSION_BY_SHORTNAME[shortname];
};

export const getShortnameByProf = (profession: Profession): string => {
  return SHORTNAME_BY_PROFESSION[profession];
};

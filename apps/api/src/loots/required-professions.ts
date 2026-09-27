import { getProfByShortname } from "@lootlog/domain/profession";
import { ProfessionEnum as Profession } from "@lootlog/schema/loot";

export const parseRequiredProfessions = (
  required?: string | null,
): Profession[] =>
  required
    ? required
        .split("")
        .map((short) => getProfByShortname(short))
        .filter((prof) => prof !== undefined)
    : Object.values(Profession);

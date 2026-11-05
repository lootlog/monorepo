import { getShortnameByProf } from "@lootlog/domain/profession";
import type { TFunction } from "i18next";
import type { LootRosterPlayer } from "./build-loot-roster";

/** "Lvl 308 · Łowca", or whichever of the two is known. */
export const formatRosterPlayerDetail = (
  t: TFunction,
  player: Pick<LootRosterPlayer, "lvl" | "prof">,
) => {
  const professionShortname = player.prof
    ? (getShortnameByProf(player.prof) ?? player.prof.charAt(0).toLowerCase())
    : undefined;

  return [
    player.lvl !== null ? t("common.levelShort", { level: player.lvl }) : null,
    professionShortname ? t(`professions.${professionShortname}`) : null,
  ]
    .filter((part) => part !== null)
    .join(" · ");
};

import { getNpcTypeNames } from "@/constants/margonem";
import type { Timer } from "@/api/timers.api";
import { isManualTimer } from "./timer-kind";

type LevelSource = { lvl?: number | null; prof?: string | null };

/** `123w` for level 123 warrior; empty when the level is unknown or zero. */
export const formatLevelTag = ({ lvl, prof }: LevelSource) => {
  if (!lvl || lvl <= 0) return "";

  return `${lvl}${prof?.charAt(0).toLowerCase() ?? ""}`;
};

/** ` (123w)` suffix appended to an NPC name; empty when there is no level. */
export const formatLevelSuffix = (source: LevelSource) => {
  const tag = formatLevelTag(source);

  return tag ? ` (${tag})` : "";
};

/** `Name (123w)`; the level tag is omitted when unknown. */
export const formatCharacterLabel = (
  character: LevelSource & { name: string },
) => `${character.name}${formatLevelSuffix(character)}`;

/** `[H]`, `[M]` for a manual timer without a type, `[M][H]` for a typed one. */
export const getTimerShortname = (timer: Timer) => {
  const typeShortname = getNpcTypeNames(timer.npc.type)?.shortname;

  if (isManualTimer(timer)) {
    return typeShortname ? `[M][${typeShortname}]` : "[M]";
  }

  return `[${typeShortname ?? "M"}]`;
};

import { getApiErrorStatus } from "@lootlog/client/transport";

/** Why a disqualification or a restore failed, as a translation key. */
export const getFactionWarModerationErrorKey = (cause: unknown) => {
  switch (getApiErrorStatus(cause)) {
    case 403:
      return "factionWar.moderation.errors.forbidden";
    case 404:
      return "factionWar.moderation.errors.notFound";
    default:
      return "factionWar.moderation.errors.generic";
  }
};

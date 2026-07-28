export const MARGONEM_CDN_CHARACTERS_URL =
  "https://micc.garmory-cdn.cloud/obrazki/postacie";
export const MARGONEM_CDN_ITEMS_URL =
  "https://micc.garmory-cdn.cloud/obrazki/itemy";
export const MARGONEM_CDN_NPCS_URL =
  "https://micc.garmory-cdn.cloud/obrazki/npc/";

export const MARGONEM_PROFILE_URL = "https://www.margonem.pl/profile/view";
export const MARGONEM_GUILD_URL = "https://www.margonem.pl/guilds/view";

type MargonemProfileUrlInput = {
  accountId: number | string | null | undefined;
  characterId?: number | string | null;
  world?: string | null;
};

export function getMargonemProfileUrl({
  accountId,
  characterId,
  world,
}: MargonemProfileUrlInput) {
  const parsedAccountId = Number(accountId);
  if (!Number.isInteger(parsedAccountId) || parsedAccountId <= 0) {
    return null;
  }

  const parsedCharacterId = Number(characterId);
  if (
    !Number.isInteger(parsedCharacterId) ||
    parsedCharacterId <= 0 ||
    !world
  ) {
    return `${MARGONEM_PROFILE_URL},${parsedAccountId}`;
  }

  return `${MARGONEM_PROFILE_URL},${parsedAccountId}#char_${parsedCharacterId},${world}`;
}

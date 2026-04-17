import { LanguageVersion } from "@/store/global.store";
import { get } from "@/utils/object-utils";
import { getApiClient } from "@/lib/api-client";

const MARGONEM_CHARACTER_LIST_URL =
  "https://public-api.margonem.pl/account/charlist";
const MARGONEM_CHARACTER_LIST_EN_URL =
  "https://public-api.margonem.com/account/charlist";

export type MargonemCharacter = {
  clan?: number;
  clan_rank?: number;
  gender?: "m" | "f";
  icon: string;
  id: number;
  last?: number;
  lvl: number;
  nick: string;
  prof: string;
  world?: string;
};

const toNumberOrNull = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return null;
};

const toStringOrNull = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const findValueByAliases = (
  characterData: Record<string, unknown>,
  aliases: string[],
) => {
  for (const alias of aliases) {
    const directValue = characterData[alias];

    if (directValue !== undefined) {
      return directValue;
    }
  }

  const loweredAliases = new Set(aliases.map((alias) => alias.toLowerCase()));

  for (const [key, value] of Object.entries(characterData)) {
    if (loweredAliases.has(key.toLowerCase())) {
      return value;
    }
  }

  return undefined;
};

const unwrapCharacterData = (characterData: Record<string, unknown>) => {
  const nestedCharacterCandidates = [
    characterData.character,
    characterData.char,
    characterData.hero,
    characterData.data,
    characterData.d,
    characterData.value,
  ];

  for (const nestedCharacterCandidate of nestedCharacterCandidates) {
    if (
      typeof nestedCharacterCandidate === "object" &&
      nestedCharacterCandidate !== null &&
      !Array.isArray(nestedCharacterCandidate)
    ) {
      return nestedCharacterCandidate as Record<string, unknown>;
    }
  }

  return characterData;
};

const normalizeCharacter = (character: unknown): MargonemCharacter | null => {
  if (Array.isArray(character)) {
    const [id, nick, world, lvl, prof, gender, icon, last, clan, clan_rank] =
      character;

    return normalizeCharacter({
      clan,
      clan_rank,
      gender,
      icon,
      id,
      last,
      lvl,
      nick,
      prof,
      world,
    });
  }

  if (typeof character !== "object" || character === null) {
    return null;
  }

  const characterData = unwrapCharacterData(
    character as Record<string, unknown>,
  );
  const normalizedId = toNumberOrNull(
    findValueByAliases(characterData, ["id", "charId", "characterId"]),
  );
  const normalizedIcon = toStringOrNull(
    findValueByAliases(characterData, [
      "icon",
      "image",
      "imageUrl",
      "iconUrl",
      "avatar",
    ]),
  );
  const normalizedLevel = toNumberOrNull(
    findValueByAliases(characterData, ["lvl", "level"]),
  );
  const normalizedNick = toStringOrNull(
    findValueByAliases(characterData, ["nick", "nickname", "name"]),
  );
  const normalizedProfession = toStringOrNull(
    findValueByAliases(characterData, ["prof", "profession", "class"]),
  );
  const normalizedWorld = toStringOrNull(
    findValueByAliases(characterData, [
      "world",
      "server",
      "worldName",
      "worldname",
      "serverName",
    ]),
  );

  if (
    normalizedId === null ||
    normalizedIcon === null ||
    normalizedLevel === null ||
    normalizedNick === null ||
    normalizedProfession === null ||
    normalizedWorld === null
  ) {
    return null;
  }

  const normalizedClan = toNumberOrNull(
    findValueByAliases(characterData, ["clan", "clanId"]),
  );
  const normalizedClanRank = toNumberOrNull(
    findValueByAliases(characterData, ["clan_rank", "clanRank"]),
  );
  const normalizedLast = toNumberOrNull(
    findValueByAliases(characterData, ["last", "lastSeen", "lastLogin"]),
  );
  const rawGender = findValueByAliases(characterData, ["gender", "sex"]);
  const normalizedGender =
    rawGender === "m" || rawGender === "f" ? rawGender : undefined;

  return {
    clan: normalizedClan ?? undefined,
    clan_rank: normalizedClanRank ?? undefined,
    gender: normalizedGender,
    icon: normalizedIcon,
    id: normalizedId,
    last: normalizedLast ?? undefined,
    lvl: normalizedLevel,
    nick: normalizedNick,
    prof: normalizedProfession,
    world: normalizedWorld,
  };
};

export const normalizeCharacterList = (
  characters: unknown,
): MargonemCharacter[] => {
  if (!Array.isArray(characters)) {
    return [];
  }

  return characters.reduce<MargonemCharacter[]>(
    (normalizedCharacters, character) => {
      const normalizedCharacter = normalizeCharacter(character);

      if (normalizedCharacter) {
        normalizedCharacters.push(normalizedCharacter);
      }

      return normalizedCharacters;
    },
    [],
  );
};

const filterCharactersByWorld = (
  characters: MargonemCharacter[],
  world: string | undefined,
) => {
  return characters
    .filter((character) => character.world === world)
    .sort(
      (firstCharacter, secondCharacter) =>
        secondCharacter.lvl - firstCharacter.lvl,
    );
};

type FetchCharacterListOptions = {
  accountId: number;
  world: string | undefined;
  languageVersion: LanguageVersion;
};

export async function fetchCharacterList({
  accountId,
  world,
  languageVersion,
}: FetchCharacterListOptions): Promise<MargonemCharacter[]> {
  const margonemEntry = window.localStorage?.getItem("Margonem");
  const accountIdKey = String(accountId);

  let parsed: unknown = null;

  if (margonemEntry) {
    try {
      parsed = JSON.parse(margonemEntry);
    } catch (error) {
      throw error;
    }
  }

  // @ts-expect-error `get` accepts runtime data here; `parsed` intentionally stays `unknown`.
  const charlist = get(parsed, "charlist", null) as Record<
    string,
    MargonemCharacter[]
  > | null;
  const rawCachedCharacters = accountId
    ? (charlist?.[accountIdKey] ?? null)
    : null;

  const cached = accountId ? normalizeCharacterList(rawCachedCharacters) : [];
  const filteredCached = filterCharactersByWorld(cached, world);

  if (filteredCached.length > 0) {
    return filteredCached;
  }

  const hs3 = window.getCookie?.("hs3");
  const url =
    languageVersion === LanguageVersion.PL
      ? MARGONEM_CHARACTER_LIST_URL
      : MARGONEM_CHARACTER_LIST_EN_URL;

  if (!hs3) {
    throw new Error("Missing required authentication cookie");
  }

  const client = getApiClient("public");
  const response = await client.get<MargonemCharacter[]>(`${url}?hs3=${hs3}`, {
    withCredentials: true,
  });
  const normalizedCharacters = normalizeCharacterList(response.data);
  const filteredCharacters = filterCharactersByWorld(
    normalizedCharacters,
    world,
  );

  if (!response.data || response.data.length === 0) {
    throw new Error("Empty character list received from API");
  }

  return filteredCharacters;
}

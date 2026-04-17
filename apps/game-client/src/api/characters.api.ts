import { LanguageVersion } from "@/store/global.store";
import { get } from "@/utils/object-utils";
import { getApiClient } from "@/lib/api-client";

const MARGONEM_CHARACTER_LIST_URL =
  "https://public-api.margonem.pl/account/charlist";
const MARGONEM_CHARACTER_LIST_EN_URL =
  "https://public-api.margonem.com/account/charlist";
const CHARACTER_LIST_LOG_PREFIX = "[CharacterList]";

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

export const normalizeCharacterList = (
  characters: unknown,
): MargonemCharacter[] => {
  if (!Array.isArray(characters)) {
    return [];
  }

  return characters.filter((character): character is MargonemCharacter => {
    return (
      typeof character === "object" &&
      character !== null &&
      typeof character.id === "number" &&
      typeof character.icon === "string" &&
      typeof character.lvl === "number" &&
      typeof character.nick === "string" &&
      typeof character.prof === "string" &&
      typeof character.world === "string"
    );
  });
};

const logCharacterListDebug = (
  message: string,
  details?: Record<string, unknown>,
) => {
  if (details) {
    console.log(`${CHARACTER_LIST_LOG_PREFIX} ${message}`, details);
    return;
  }

  console.log(`${CHARACTER_LIST_LOG_PREFIX} ${message}`);
};

const getCharacterWorldCounts = (characters: MargonemCharacter[]) => {
  return characters.reduce<Record<string, number>>((worldCounts, character) => {
    // @ts-expect-error `normalizeCharacterList` guarantees `world` is a string here.
    worldCounts[character.world] = (worldCounts[character.world] ?? 0) + 1;
    return worldCounts;
  }, {});
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

  logCharacterListDebug("Fetching character list", {
    accountId,
    world,
    languageVersion,
    hasMargonemEntry: Boolean(margonemEntry),
  });

  let parsed: unknown = null;

  if (margonemEntry) {
    try {
      parsed = JSON.parse(margonemEntry);
    } catch (error) {
      console.warn(
        `${CHARACTER_LIST_LOG_PREFIX} Failed to parse Margonem cache`,
        {
          accountId,
          world,
          margonemEntryLength: margonemEntry.length,
          error,
        },
      );
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

  logCharacterListDebug("Resolved cached character list", {
    accountId,
    world,
    hasCharlist: Boolean(charlist),
    rawCachedType:
      rawCachedCharacters === null ? "missing" : typeof rawCachedCharacters,
    rawCachedCount: Array.isArray(rawCachedCharacters)
      ? rawCachedCharacters.length
      : null,
    normalizedCachedCount: cached.length,
    filteredCachedCount: filteredCached.length,
    cachedWorldCounts: getCharacterWorldCounts(cached),
  });

  if (cached.length > 0) {
    logCharacterListDebug("Returning cached character list", {
      accountId,
      world,
      filteredCachedCount: filteredCached.length,
    });

    return filteredCached;
  }

  const hs3 = window.getCookie?.("hs3");
  const url =
    languageVersion === LanguageVersion.PL
      ? MARGONEM_CHARACTER_LIST_URL
      : MARGONEM_CHARACTER_LIST_EN_URL;

  logCharacterListDebug("Cache miss, falling back to public API", {
    accountId,
    world,
    url,
    hasHs3: Boolean(hs3),
  });

  if (!hs3) {
    console.warn(`${CHARACTER_LIST_LOG_PREFIX} Missing authentication cookie`, {
      accountId,
      world,
      url,
    });
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

  logCharacterListDebug("Received public API character list", {
    accountId,
    world,
    rawApiCount: Array.isArray(response.data) ? response.data.length : null,
    normalizedApiCount: normalizedCharacters.length,
    filteredApiCount: filteredCharacters.length,
    apiWorldCounts: getCharacterWorldCounts(normalizedCharacters),
  });

  if (!response.data || response.data.length === 0) {
    console.warn(
      `${CHARACTER_LIST_LOG_PREFIX} Empty character list received from API`,
      {
        accountId,
        world,
        url,
      },
    );
    throw new Error("Empty character list received from API");
  }

  return filteredCharacters;
}

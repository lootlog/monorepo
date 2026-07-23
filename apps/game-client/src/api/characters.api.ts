import { LanguageVersion } from "@/store/global.store";
import { createApiClient } from "@lootlog/api-client/transport";
import { getRuntimeCookie } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";

const MARGONEM_CHARACTER_LIST_URL =
  "https://public-api.margonem.pl/account/charlist";
const MARGONEM_CHARACTER_LIST_EN_URL =
  "https://public-api.margonem.com/account/charlist";

export const CHARACTER_LIST_CACHE_FRESH_TTL_MS = 15 * 60 * 1000;
export const CHARACTER_LIST_CACHE_STALE_TTL_MS = 24 * 60 * 60 * 1000;
export const CHARACTER_LIST_CACHE_ENTRY_CAP = 20;

const CHARACTER_LIST_CACHE_KEY_PREFIX = "lootlog:margonem-character-list:v1";
const MARGONEM_LOCAL_STORAGE_KEY = "Margonem";

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

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    if (isRecord(nestedCharacterCandidate)) {
      return nestedCharacterCandidate;
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

  return characters
    .map(normalizeCharacter)
    .filter((character): character is MargonemCharacter => character !== null);
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

type CharacterListCacheEntry = {
  cachedAt: number;
  characters: MargonemCharacter[];
};

const parseJsonOrNull = (value: string | null): unknown => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const getLocalStorageItem = (key: string): string | null => {
  try {
    return window.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const setLocalStorageItem = (key: string, value: string): void => {
  try {
    window.localStorage?.setItem(key, value);
  } catch {
    // Ignore quota/privacy errors; the API response can still be returned.
  }
};

const removeLocalStorageItem = (key: string): void => {
  try {
    window.localStorage?.removeItem(key);
  } catch {
    // Ignore storage errors.
  }
};

const getLocalStorageKeys = (): string[] => {
  try {
    return Array.from(
      { length: window.localStorage?.length ?? 0 },
      (_, index) => window.localStorage?.key(index) ?? null,
    ).filter((key): key is string => key !== null);
  } catch {
    return [];
  }
};

const getPersistentCharacterListCacheKey = ({
  accountId,
  world,
  languageVersion,
}: FetchCharacterListOptions) => {
  return [
    CHARACTER_LIST_CACHE_KEY_PREFIX,
    languageVersion,
    String(accountId),
    world ?? "unknown",
  ].join(":");
};

const isCharacterListCacheEntry = (
  value: unknown,
): value is CharacterListCacheEntry => {
  return (
    isRecord(value) &&
    typeof value.cachedAt === "number" &&
    Number.isFinite(value.cachedAt) &&
    Array.isArray(value.characters)
  );
};

const sweepPersistentCharacterListCache = (now = Date.now()): void => {
  const retainedEntries: Array<{
    cachedAt: number;
    key: string;
    storageIndex: number;
  }> = [];

  for (const [storageIndex, key] of getLocalStorageKeys().entries()) {
    if (!key.startsWith(`${CHARACTER_LIST_CACHE_KEY_PREFIX}:`)) {
      continue;
    }

    const parsed = parseJsonOrNull(getLocalStorageItem(key));
    if (!isCharacterListCacheEntry(parsed)) {
      removeLocalStorageItem(key);
      continue;
    }

    const ageMs = now - parsed.cachedAt;
    if (ageMs < 0 || ageMs > CHARACTER_LIST_CACHE_STALE_TTL_MS) {
      removeLocalStorageItem(key);
      continue;
    }

    retainedEntries.push({ cachedAt: parsed.cachedAt, key, storageIndex });
  }

  retainedEntries.sort((firstEntry, secondEntry) => {
    const timeDifference = secondEntry.cachedAt - firstEntry.cachedAt;
    if (timeDifference !== 0) return timeDifference;

    return secondEntry.storageIndex - firstEntry.storageIndex;
  });
  for (const entry of retainedEntries.slice(CHARACTER_LIST_CACHE_ENTRY_CAP)) {
    removeLocalStorageItem(entry.key);
  }
};

const readPersistentCharacterListCache = (
  options: FetchCharacterListOptions,
  maxAgeMs: number,
) => {
  const cacheKey = getPersistentCharacterListCacheKey(options);
  const parsed = parseJsonOrNull(getLocalStorageItem(cacheKey));

  if (!isCharacterListCacheEntry(parsed)) {
    if (parsed !== null) {
      removeLocalStorageItem(cacheKey);
    }

    return [];
  }

  const ageMs = Date.now() - parsed.cachedAt;

  if (ageMs < 0 || ageMs > CHARACTER_LIST_CACHE_STALE_TTL_MS) {
    removeLocalStorageItem(cacheKey);
    return [];
  }

  if (ageMs > maxAgeMs) {
    return [];
  }

  return filterCharactersByWorld(
    normalizeCharacterList(parsed.characters),
    options.world,
  );
};

const writePersistentCharacterListCache = (
  options: FetchCharacterListOptions,
  characters: MargonemCharacter[],
) => {
  const cacheEntry: CharacterListCacheEntry = {
    cachedAt: Date.now(),
    characters,
  };

  setLocalStorageItem(
    getPersistentCharacterListCacheKey(options),
    JSON.stringify(cacheEntry),
  );
  sweepPersistentCharacterListCache(cacheEntry.cachedAt);
};

const readMargonemCharacterListCache = ({
  accountId,
  world,
}: FetchCharacterListOptions) => {
  const parsed = parseJsonOrNull(
    getLocalStorageItem(MARGONEM_LOCAL_STORAGE_KEY),
  );
  const accountIdKey = String(accountId);
  const charlist =
    isRecord(parsed) && isRecord(parsed.charlist) ? parsed.charlist : null;
  const rawCachedCharacters = accountId
    ? (charlist?.[accountIdKey] ?? null)
    : null;
  const cached = accountId ? normalizeCharacterList(rawCachedCharacters) : [];

  return filterCharactersByWorld(cached, world);
};

export async function fetchCharacterList({
  accountId,
  world,
  languageVersion,
}: FetchCharacterListOptions): Promise<MargonemCharacter[]> {
  sweepPersistentCharacterListCache();
  const options = { accountId, world, languageVersion };
  const filteredCached = readMargonemCharacterListCache(options);

  if (filteredCached.length > 0) {
    writePersistentCharacterListCache(options, filteredCached);
    return filteredCached;
  }

  const freshPersistentCache = readPersistentCharacterListCache(
    options,
    CHARACTER_LIST_CACHE_FRESH_TTL_MS,
  );

  if (freshPersistentCache.length > 0) {
    return freshPersistentCache;
  }

  const hs3 = getRuntimeCookie("hs3");
  const url =
    languageVersion === LanguageVersion.PL
      ? MARGONEM_CHARACTER_LIST_URL
      : MARGONEM_CHARACTER_LIST_EN_URL;

  try {
    if (!hs3) {
      throw new Error("Missing required authentication cookie");
    }

    const client = createApiClient("main", { credentials: "include" });
    const characters = await client.get<MargonemCharacter[]>(
      `${url}?hs3=${hs3}`,
    );
    const normalizedCharacters = normalizeCharacterList(characters);
    const filteredCharacters = filterCharactersByWorld(
      normalizedCharacters,
      world,
    );

    if (characters.length === 0) {
      throw new Error("Empty character list received from API");
    }

    writePersistentCharacterListCache(options, filteredCharacters);

    return filteredCharacters;
  } catch (error) {
    const stalePersistentCache = readPersistentCharacterListCache(
      options,
      CHARACTER_LIST_CACHE_STALE_TTL_MS,
    );

    if (stalePersistentCache.length > 0) {
      return stalePersistentCache;
    }

    throw error;
  }
}

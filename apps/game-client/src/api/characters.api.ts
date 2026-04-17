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
      typeof character.id === "number"
    );
  });
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
  const parsed = margonemEntry ? JSON.parse(margonemEntry) : null;

  const charlist = get(parsed, "charlist", null) as Record<
    string,
    MargonemCharacter[]
  > | null;

  const cached = accountId
    ? normalizeCharacterList(charlist?.[accountId] ?? null)
    : [];

  if (cached.length > 0) {
    return cached
      .filter((character) => character.world === world)
      .sort((a, b) => b.lvl - a.lvl);
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

  if (!response.data || response.data.length === 0) {
    throw new Error("Empty character list received from API");
  }

  return normalizeCharacterList(response.data)
    .filter((character) => character.world === world)
    .sort((a, b) => b.lvl - a.lvl);
}

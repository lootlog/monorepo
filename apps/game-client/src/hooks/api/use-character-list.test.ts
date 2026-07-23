import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHARACTER_LIST_CACHE_STALE_TTL_MS,
  fetchCharacterList,
  normalizeCharacterList,
} from "@/api";
import { LanguageVersion } from "@/store/global.store";

const createCharacter = (overrides?: {
  id?: number;
  lvl?: number;
  nick?: string;
  world?: string;
}) => ({
  id: overrides?.id ?? 1,
  icon: "/icon.gif",
  lvl: overrides?.lvl ?? 300,
  nick: overrides?.nick ?? "Hero",
  prof: "w",
  world: overrides?.world ?? "fobos",
});

const createJsonResponse = (data: unknown) => {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json",
    },
    status: 200,
  });
};

const getCharacterListCacheKey = () => {
  for (let index = 0; index < window.localStorage.length; index++) {
    const key = window.localStorage.key(index);

    if (key?.startsWith("lootlog:margonem-character-list:v1:")) {
      return key;
    }
  }

  throw new Error("Character list cache key not found");
};

describe("use-character-list helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    vi.stubGlobal("fetch", vi.fn());
    window.localStorage.clear();
    testRuntimeWindow.getCookie = vi.fn(() => "hs3-token");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("keeps valid character entries", () => {
    expect(
      normalizeCharacterList([
        {
          id: 1,
          icon: "icon",
          lvl: 300,
          nick: "Hero",
          prof: "w",
          world: "fobos",
        },
      ]),
    ).toEqual([
      {
        id: 1,
        icon: "icon",
        lvl: 300,
        nick: "Hero",
        prof: "w",
        world: "fobos",
      },
    ]);
  });

  it("coerces string numeric fields from charlist payloads", () => {
    expect(
      normalizeCharacterList([
        {
          id: "1",
          icon: "/icon.gif",
          lvl: "300",
          nick: "Hero",
          prof: "w",
          world: "fobos",
          clan: "12",
          clan_rank: "3",
          last: "123456",
        },
      ]),
    ).toEqual([
      {
        id: 1,
        icon: "/icon.gif",
        lvl: 300,
        nick: "Hero",
        prof: "w",
        world: "fobos",
        clan: 12,
        clan_rank: 3,
        last: 123456,
      },
    ]);
  });

  it("normalizes tuple-based character payloads", () => {
    expect(
      normalizeCharacterList([
        [1, "Hero", "fobos", "300", "w", "m", "/icon.gif", "123456", "7", "2"],
      ]),
    ).toEqual([
      {
        id: 1,
        nick: "Hero",
        world: "fobos",
        lvl: 300,
        prof: "w",
        gender: "m",
        icon: "/icon.gif",
        last: 123456,
        clan: 7,
        clan_rank: 2,
      },
    ]);
  });

  it("normalizes nested payloads with alias field names", () => {
    expect(
      normalizeCharacterList([
        {
          character: {
            characterId: "1",
            nickname: "Hero",
            serverName: "fobos",
            level: "300",
            profession: "w",
            imageUrl: "/icon.gif",
          },
        },
      ]),
    ).toEqual([
      {
        id: 1,
        nick: "Hero",
        world: "fobos",
        lvl: 300,
        prof: "w",
        icon: "/icon.gif",
      },
    ]);
  });

  it("drops legacy cached response objects instead of throwing in consumers", () => {
    expect(
      normalizeCharacterList({
        data: [
          {
            id: 1,
            icon: "icon",
            lvl: 300,
            nick: "Hero",
            prof: "w",
            world: "fobos",
          },
        ],
      }),
    ).toEqual([]);
  });

  it("uses the local Margonem character cache before calling the public API", async () => {
    window.localStorage.setItem(
      "Margonem",
      JSON.stringify({
        charlist: {
          "123": [
            createCharacter({ id: 1, lvl: 100 }),
            createCharacter({ id: 2, lvl: 300 }),
            createCharacter({ id: 3, world: "telawel" }),
          ],
        },
      }),
    );

    const result = await fetchCharacterList({
      accountId: 123,
      world: "fobos",
      languageVersion: LanguageVersion.PL,
    });

    expect(result.map((character) => character.id)).toEqual([2, 1]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reuses the fresh Lootlog persistent character cache", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(createJsonResponse([createCharacter()]));

    await fetchCharacterList({
      accountId: 123,
      world: "fobos",
      languageVersion: LanguageVersion.PL,
    });

    fetchMock.mockClear();

    const result = await fetchCharacterList({
      accountId: 123,
      world: "fobos",
      languageVersion: LanguageVersion.PL,
    });

    expect(result).toEqual([createCharacter()]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns stale persistent characters when the public API fails", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(createJsonResponse([createCharacter()]));

    await fetchCharacterList({
      accountId: 123,
      world: "fobos",
      languageVersion: LanguageVersion.PL,
    });

    vi.setSystemTime(new Date("2026-01-01T00:16:00.000Z"));
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const result = await fetchCharacterList({
      accountId: 123,
      world: "fobos",
      languageVersion: LanguageVersion.PL,
    });

    expect(result).toEqual([createCharacter()]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns stale persistent characters when hs3 is unavailable", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(createJsonResponse([createCharacter()]));

    await fetchCharacterList({
      accountId: 123,
      world: "fobos",
      languageVersion: LanguageVersion.PL,
    });

    vi.setSystemTime(new Date("2026-01-01T00:16:00.000Z"));
    testRuntimeWindow.getCookie = vi.fn(() => null);

    const result = await fetchCharacterList({
      accountId: 123,
      world: "fobos",
      languageVersion: LanguageVersion.PL,
    });

    expect(result).toEqual([createCharacter()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("recovers from malformed persistent cache entries", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(createJsonResponse([createCharacter()]));

    await fetchCharacterList({
      accountId: 123,
      world: "fobos",
      languageVersion: LanguageVersion.PL,
    });

    window.localStorage.setItem(getCharacterListCacheKey(), "{bad-json");
    fetchMock.mockResolvedValueOnce(
      createJsonResponse([createCharacter({ id: 4, nick: "Recovered" })]),
    );

    const result = await fetchCharacterList({
      accountId: 123,
      world: "fobos",
      languageVersion: LanguageVersion.PL,
    });

    expect(result).toEqual([createCharacter({ id: 4, nick: "Recovered" })]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("removes a persistent character cache entry after its stale TTL", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(createJsonResponse([createCharacter()]));
    const options = {
      accountId: 123,
      world: "fobos",
      languageVersion: LanguageVersion.PL,
    };

    await fetchCharacterList(options);
    const cacheKey = getCharacterListCacheKey();
    vi.advanceTimersByTime(CHARACTER_LIST_CACHE_STALE_TTL_MS + 1);
    testRuntimeWindow.getCookie = vi.fn(() => null);

    await expect(fetchCharacterList(options)).rejects.toThrow(
      "Missing required authentication cookie",
    );
    expect(window.localStorage.getItem(cacheKey)).toBeNull();
  });

  it("keeps only the 20 newest persistent character cache entries", async () => {
    const cachePrefix = "lootlog:margonem-character-list:v1";
    const now = Date.now();

    for (let index = 0; index < 25; index += 1) {
      window.localStorage.setItem(
        `${cachePrefix}:test:${index}:world-${index}`,
        JSON.stringify({ cachedAt: now, characters: [] }),
      );
    }
    testRuntimeWindow.getCookie = vi.fn(() => null);

    await expect(
      fetchCharacterList({
        accountId: 999,
        world: "missing",
        languageVersion: LanguageVersion.PL,
      }),
    ).rejects.toThrow("Missing required authentication cookie");

    const retainedKeys = Array.from(
      { length: window.localStorage.length },
      (_, index) => window.localStorage.key(index),
    ).filter((key) => key?.startsWith(`${cachePrefix}:`));
    expect(retainedKeys).toHaveLength(20);
    expect(
      window.localStorage.getItem(`${cachePrefix}:test:0:world-0`),
    ).toBeNull();
    expect(
      window.localStorage.getItem(`${cachePrefix}:test:24:world-24`),
    ).not.toBeNull();
  });
});
import { testRuntimeWindow } from "@/test/test-runtime-window";

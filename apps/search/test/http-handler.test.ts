import { describe, expect, mock, test } from "bun:test";
import {
  makeSearchHandler,
  type SearchServicesValue,
} from "../src/search-application.js";

const services = (): SearchServicesValue => ({
  items: {
    searchItems: mock((query) => Promise.resolve({ query, hits: [] })),
  } as unknown as SearchServicesValue["items"],
  npcs: {
    getNpcs: mock((query) => Promise.resolve([{ query }])),
  } as unknown as SearchServicesValue["npcs"],
  players: {
    getPlayers: mock((query) => Promise.resolve([{ query }])),
  } as unknown as SearchServicesValue["players"],
  all: {
    searchAll: mock((query) =>
      Promise.resolve({ query, items: [], npcs: [], players: [] }),
    ),
  } as unknown as SearchServicesValue["all"],
});

describe("Search HTTP contract", () => {
  test("preserves health response", async () => {
    const response = await makeSearchHandler(services())(
      new Request("http://localhost/healthz"),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  });

  test("parses the item query contract", async () => {
    const response = await makeSearchHandler(services())(
      new Request(
        "http://localhost/items?limit=5&offset=2&facets=rarity,type&filter=world%20%3D%20berufs",
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      query: {
        limit: 5,
        offset: 2,
        filter: "world = berufs",
        facets: ["rarity", "type"],
      },
      hits: [],
    });
  });

  test("returns 404 for unknown paths", async () => {
    const response = await makeSearchHandler(services())(
      new Request("http://localhost/private"),
    );
    expect(response.status).toBe(404);
  });
});

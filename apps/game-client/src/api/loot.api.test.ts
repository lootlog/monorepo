import { configureApiClients } from "@lootlog/client/transport";
import { beforeEach, describe, expect, it, vi, onTestFinished } from "vitest";
import { useLogsStore } from "@/store/logs.store";
import { createLoot, type CreateLootOptions } from "./loot.api";

const http = vi.fn<typeof fetch>();

describe("createLoot", () => {
  beforeEach(() => {
    http.mockReset();
    onTestFinished(
      configureApiClients({
        main: { baseUrl: "https://api.example.test", fetch: http },
        battlelog: { baseUrl: "https://battle.example.test", fetch: http },
      }),
    );
    useLogsStore.getState().clearActions();
  });

  it("posts the complete loot payload", async () => {
    const loot = {
      cl: 16,
      hid: "loot-hid",
      icon: "loot.gif",
      id: 9001,
      name: "Unique loot",
      pr: 1,
      prc: "1",
      stat: "rarity=unique",
    };

    const options: CreateLootOptions = {
      accountId: "account-1",
      characterId: "character-1",
      location: "Nithal",
      loots: [loot],
      npcs: [
        {
          hpp: 0,
          icon: "boss.gif",
          id: 100,
          location: "Nithal",
          lvl: 300,
          name: "Boss",
          prof: "w",
          type: 2,
          wt: 85,
        },
      ],
      players: [
        {
          accountId: 123,
          hpp: 100,
          icon: "hero.gif",
          id: 456,
          lvl: 300,
          name: "Hero",
          prof: "w",
        },
      ],
      source: "FIGHT",
      world: "pandora",
    };

    const response = {
      id: 1,
      rejectedGuilds: [],
      submittedGuilds: [{ guildId: "guild-1", guildName: "Guild" }],
    };

    http.mockResolvedValue(Response.json(response));

    await expect(
      createLoot(options, { attemptId: "attempt-1", source: "fight" }),
    ).resolves.toEqual(response);

    expect(http).toHaveBeenCalledTimes(1);
    const call = http.mock.calls[0];

    if (!call) throw new Error("Missing HTTP request");
    const request = new Request(...call);
    expect(new URL(request.url).pathname).toBe("/loots");
    expect(await request.json()).toEqual(options);
    const [action] = useLogsStore.getState().actions;
    expect(action?.payload).toEqual(options);
    expect(action?.requests[0]?.payload).toEqual(options);
  });
  it("sends map presence without storing it in diagnostic action payloads", async () => {
    const options: CreateLootOptions = {
      accountId: "1",
      characterId: "2",
      location: "Map",
      world: "pandora",
      source: "FIGHT",
      loots: [],
      npcs: [],
      players: [],
      mapPlayersSnapshot: [
        {
          accountId: 1,
          characterId: 2,
          name: "Hero",
          prof: "WARRIOR",
          icon: null,
        },
      ],
    };

    http.mockResolvedValue(
      Response.json({ id: 1, rejectedGuilds: [], submittedGuilds: [] }),
    );
    await createLoot(options, { attemptId: "snapshot", source: "fight" });
    expect(http).toHaveBeenCalledTimes(1);
    const call = http.mock.calls[0];

    if (!call) throw new Error("Missing HTTP request");
    const request = new Request(...call);
    expect(new URL(request.url).pathname).toBe("/loots");
    expect(await request.json()).toEqual(options);
    const [action] = useLogsStore.getState().actions;
    expect(action?.payload).not.toHaveProperty("mapPlayersSnapshot");
    expect(action?.requests[0]?.payload).not.toHaveProperty(
      "mapPlayersSnapshot",
    );
  });
});

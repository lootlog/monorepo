import { configureApiClients } from "@lootlog/client/transport";
import { beforeEach, describe, expect, it, vi, onTestFinished } from "vitest";
import { useLogsStore } from "@/store/logs.store";
import { createLoot } from "./loot.api";
import type { CreateLootDto } from "@lootlog/client/main";
import { getFixedT } from "@/i18n/get-fixed-t";
import { createAutoTimer } from "./timers.api";
import { createNotification } from "./messaging.api";

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

  it.each(["loot", "loot-npc", "timer", "notification"] as const)(
    "logs unresolved %s location without sending or retrying the payload",
    async (operation) => {
      const npc = {
        id: 100,
        name: "Boss",
        icon: "boss.gif",
        location: " ",
        lvl: 300,
        hpp: 0,
        prof: "w",
        type: 2,
        wt: 85,
      };

      const options: CreateLootDto = {
        accountId: "1",
        characterId: "2",
        location: operation === "loot" ? "" : "Nithal",
        world: "luvia",
        source: "FIGHT",
        loots: [],
        npcs: [npc],
        players: [],
      };

      const execute = () => {
        if (operation === "timer") {
          return createAutoTimer({ ...options, npc, respBaseSeconds: 561 });
        }

        if (operation === "notification") {
          return createNotification({ npc, world: "luvia", guildIds: [] });
        }

        return createLoot(options, {
          attemptId: "missing-map",
          source: "fight",
        });
      };

      await expect(execute()).rejects.toThrow(
        getFixedT("common")("errors.missingLocation"),
      );
      expect(http).not.toHaveBeenCalled();
      const [action] = useLogsStore.getState().actions;
      expect(action?.status).toBe("error");
      expect(action?.requests).toHaveLength(1);
      expect(action?.requests[0]?.response).toEqual({
        message: expect.any(String),
        data: null,
      });
    },
  );

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

    const options: CreateLootDto = {
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
      world: "luvia",
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

  it("preserves API validation details in logs without retrying a rejected submission", async () => {
    const options: CreateLootDto = {
      accountId: "1",
      characterId: "2",
      location: "Nithal",
      world: "luvia",
      source: "FIGHT",
      loots: [],
      players: [],
      npcs: [
        {
          id: 100,
          name: "Boss",
          icon: "boss.gif",
          location: "Nithal",
          lvl: 300,
          hpp: 0,
          prof: "w",
          type: 2,
          wt: 85,
        },
      ],
    };

    const response = {
      code: "VALIDATION_ERROR",
      message: "Invalid request: npcs.0.location: Expected a non-empty string",
      issues: [
        {
          path: ["npcs", 0, "location"],
          message: "Expected a non-empty string",
        },
      ],
    };

    http.mockResolvedValue(Response.json(response, { status: 400 }));

    await expect(
      createLoot(options, { attemptId: "validation-error", source: "fight" }),
    ).rejects.toThrow(response.message);

    expect(http).toHaveBeenCalledTimes(1);
    const [action] = useLogsStore.getState().actions;
    expect(action?.status).toBe("error");
    expect(action?.requests).toHaveLength(1);
    expect(action?.requests[0]).toMatchObject({
      statusCode: 400,
      response: { message: response.message, data: response },
    });
  });

  it("sends map presence without storing it in diagnostic action payloads", async () => {
    const options: CreateLootDto = {
      accountId: "1",
      characterId: "2",
      location: "Map",
      world: "luvia",
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

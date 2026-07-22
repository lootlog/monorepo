import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLogsStore } from "@/store/logs.store";
import { createLoot, type CreateLootOptions } from "./loot.api";

const { post } = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  getApiClient: () => ({ post }),
}));

describe("createLoot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    post.mockResolvedValue({ data: response, status: 201 });

    await expect(
      createLoot(options, { attemptId: "attempt-1", source: "fight" }),
    ).resolves.toEqual(response);

    expect(post).toHaveBeenCalledWith("/loots", options);
    const [action] = useLogsStore.getState().actions;
    expect(action?.payload).toEqual(options);
    expect(action?.requests[0]?.payload).toEqual(options);
  });
});

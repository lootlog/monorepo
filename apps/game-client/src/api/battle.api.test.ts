import { configureApiClients } from "@lootlog/client/transport";
import { beforeEach, describe, expect, it, vi, onTestFinished } from "vitest";
import { useLogsStore } from "@/store/logs.store";
import { createBattle, type CreateBattleOptions } from "./battle.api";

const http = vi.fn<typeof fetch>();
describe("createBattle", () => {
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

  it("retains battle events only in the logged request payload", async () => {
    const options: CreateBattleOptions = {
      accountId: "account-1",
      characterId: "character-1",
      submissionId: "submission-1",
      world: "world-1",
      events: [{ ev: 1, f: { m: ["move"] } }],
    };
    http.mockResolvedValue(Response.json({ battleId: "battle-1" }));

    await expect(createBattle(options)).resolves.toEqual({
      battleId: "battle-1",
    });

    const [action] = useLogsStore.getState().actions;
    expect(http).toHaveBeenCalledTimes(1);
    const call = http.mock.calls[0];
    if (!call) throw new Error("Missing HTTP request");
    const request = new Request(...call);
    expect(new URL(request.url).pathname).toBe("/battles");
    expect(await request.json()).toEqual(options);
    expect(action?.payload).toEqual({
      accountId: "account-1",
      characterId: "character-1",
      submissionId: "submission-1",
      world: "world-1",
      eventCount: 1,
    });
    expect(action?.requests[0]?.payload).toEqual(options);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLogsStore } from "@/store/logs.store";
import { createBattle, type CreateBattleOptions } from "./battle.api";

const { post } = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  getApiClient: () => ({ post }),
}));

describe("createBattle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    post.mockResolvedValue({ status: 201, data: { battleId: "battle-1" } });

    await expect(createBattle(options)).resolves.toEqual({
      battleId: "battle-1",
    });

    const [action] = useLogsStore.getState().actions;
    expect(post).toHaveBeenCalledWith("/battles", options);
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

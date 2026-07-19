import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import {
  CATCHING_GUILDS_CACHE_TIME_MS,
  CharacterTooltipCatchingGuildsCoordinator,
} from "@/lib/character-tooltip-catching-guilds-coordinator";
import {
  type CharacterTooltipCatchingGuildsTarget,
  useCharacterTooltipCatchingGuildsStore,
} from "@/store/character-tooltip-catching-guilds.store";

function createTarget(
  characterId: string,
  userId = `user-${characterId}`,
): CharacterTooltipCatchingGuildsTarget {
  const accountId = "account-1";

  return {
    accountId,
    characterId,
    key: `${accountId}:${characterId}`,
    playerName: `Player ${characterId}`,
    requestKey: `${userId}:${accountId}:${characterId}`,
    userId,
  };
}

function createResponse(
  targets: CharacterTooltipCatchingGuildsTarget[],
  guildIds: string[] = ["guild-1"],
) {
  return {
    players: targets.map((target) => ({
      accountId: target.accountId,
      characterId: target.characterId,
      guilds: guildIds.map((id) => ({ id, name: id })),
      userId: target.userId,
    })),
  };
}

function createApiError(status?: number): ApiError {
  return new ApiError({
    data: undefined,
    message: "Request failed",
    method: "POST",
    status,
    url: "/players/catching-guilds/batch",
  });
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}

function getEntry(target: CharacterTooltipCatchingGuildsTarget) {
  return useCharacterTooltipCatchingGuildsStore.getState().entriesByKey[
    target.key
  ];
}

describe("CharacterTooltipCatchingGuildsCoordinator", () => {
  beforeEach(() => {
    useCharacterTooltipCatchingGuildsStore.getState().clear();
  });

  it("marks every missing item in a partial response as error", async () => {
    const firstTarget = createTarget("1");
    const missingTarget = createTarget("2");
    const fetchPlayersCatchingGuilds = vi
      .fn()
      .mockResolvedValue(createResponse([firstTarget]));
    const coordinator = new CharacterTooltipCatchingGuildsCoordinator({
      fetchPlayersCatchingGuilds,
    });

    coordinator.sync([firstTarget, missingTarget], true);

    await vi.waitFor(() => {
      expect(getEntry(firstTarget)?.status).toBe("success");
      expect(getEntry(missingTarget)?.status).toBe("error");
    });
  });

  it.each([undefined, 429, 500])(
    "retries one retryable failure with status %s",
    async (status) => {
      const target = createTarget("1");
      const fetchPlayersCatchingGuilds = vi
        .fn()
        .mockRejectedValueOnce(createApiError(status))
        .mockResolvedValueOnce(createResponse([target]));
      const sleep = vi.fn().mockResolvedValue(undefined);
      const coordinator = new CharacterTooltipCatchingGuildsCoordinator({
        fetchPlayersCatchingGuilds,
        sleep,
      });

      coordinator.sync([target], true);

      await vi.waitFor(() => {
        expect(getEntry(target)?.status).toBe("success");
      });
      expect(fetchPlayersCatchingGuilds).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledWith(300);
    },
  );

  it("does not retry a non-retryable 4xx response", async () => {
    const target = createTarget("1");
    const fetchPlayersCatchingGuilds = vi
      .fn()
      .mockRejectedValue(createApiError(400));
    const coordinator = new CharacterTooltipCatchingGuildsCoordinator({
      fetchPlayersCatchingGuilds,
      sleep: vi.fn().mockResolvedValue(undefined),
    });

    coordinator.sync([target], true);

    await vi.waitFor(() => {
      expect(getEntry(target)?.status).toBe("error");
    });
    expect(fetchPlayersCatchingGuilds).toHaveBeenCalledOnce();
  });

  it("aborts a timed-out attempt, retries once, and never leaves loading", async () => {
    const target = createTarget("1");
    const fetchPlayersCatchingGuilds = vi.fn(
      (_players: unknown, signal: AbortSignal) =>
        new Promise<never>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(createApiError()));
        }),
    );
    const coordinator = new CharacterTooltipCatchingGuildsCoordinator({
      fetchPlayersCatchingGuilds,
      requestTimeoutMs: 1,
      retryDelayMs: 0,
      sleep: vi.fn().mockResolvedValue(undefined),
    });

    coordinator.sync([target], true);

    await vi.waitFor(() => {
      expect(getEntry(target)?.status).toBe("error");
    });
    expect(fetchPlayersCatchingGuilds).toHaveBeenCalledTimes(2);
  });

  it("queues a player that appears while another batch is in flight", async () => {
    const firstTarget = createTarget("1");
    const lateTarget = createTarget("2");
    const firstRequest = createDeferred<ReturnType<typeof createResponse>>();
    const fetchPlayersCatchingGuilds = vi
      .fn()
      .mockReturnValueOnce(firstRequest.promise)
      .mockResolvedValueOnce(createResponse([lateTarget]));
    const coordinator = new CharacterTooltipCatchingGuildsCoordinator({
      fetchPlayersCatchingGuilds,
    });

    coordinator.sync([firstTarget], true);
    coordinator.sync([firstTarget, lateTarget], true);

    expect(fetchPlayersCatchingGuilds).toHaveBeenCalledOnce();
    expect(getEntry(firstTarget)?.status).toBe("loading");
    firstRequest.resolve(createResponse([firstTarget]));

    await vi.waitFor(() => {
      expect(getEntry(firstTarget)?.status).toBe("success");
      expect(getEntry(lateTarget)?.status).toBe("success");
    });
    expect(fetchPlayersCatchingGuilds).toHaveBeenCalledTimes(2);
  });

  it("moves a hovered player to the front of the shared queue", async () => {
    const inFlightTarget = createTarget("1");
    const queuedTarget = createTarget("2");
    const hoveredTarget = createTarget("3");
    const firstRequest = createDeferred<ReturnType<typeof createResponse>>();
    const fetchPlayersCatchingGuilds = vi
      .fn()
      .mockReturnValueOnce(firstRequest.promise)
      .mockResolvedValueOnce(createResponse([hoveredTarget, queuedTarget]));
    const coordinator = new CharacterTooltipCatchingGuildsCoordinator({
      fetchPlayersCatchingGuilds,
    });

    coordinator.sync([inFlightTarget], true);
    coordinator.sync([inFlightTarget, queuedTarget, hoveredTarget], true);
    coordinator.prioritize(hoveredTarget);
    firstRequest.resolve(createResponse([inFlightTarget]));

    await vi.waitFor(() => {
      expect(fetchPlayersCatchingGuilds).toHaveBeenCalledTimes(2);
    });
    expect(fetchPlayersCatchingGuilds.mock.calls[1]?.[0]).toEqual([
      {
        accountId: hoveredTarget.accountId,
        characterId: hoveredTarget.characterId,
        userId: hoveredTarget.userId,
      },
      {
        accountId: queuedTarget.accountId,
        characterId: queuedTarget.characterId,
        userId: queuedTarget.userId,
      },
    ]);
  });

  it("keeps an in-flight result in cache after Shift is released", async () => {
    const target = createTarget("1");
    const request = createDeferred<ReturnType<typeof createResponse>>();
    const fetchPlayersCatchingGuilds = vi.fn().mockReturnValue(request.promise);
    const coordinator = new CharacterTooltipCatchingGuildsCoordinator({
      fetchPlayersCatchingGuilds,
    });

    coordinator.sync([target], true);
    coordinator.sync([], false);
    request.resolve(createResponse([target]));

    await vi.waitFor(() => {
      expect(getEntry(target)?.status).toBe("success");
    });
  });

  it("does not apply an old owner's result to the same character", async () => {
    const oldOwnerTarget = createTarget("1", "old-owner");
    const newOwnerTarget = createTarget("1", "new-owner");
    const oldOwnerRequest = createDeferred<ReturnType<typeof createResponse>>();
    const fetchPlayersCatchingGuilds = vi
      .fn()
      .mockReturnValueOnce(oldOwnerRequest.promise)
      .mockResolvedValueOnce(createResponse([newOwnerTarget], ["guild-new"]));
    const coordinator = new CharacterTooltipCatchingGuildsCoordinator({
      fetchPlayersCatchingGuilds,
    });

    coordinator.sync([oldOwnerTarget], true);
    coordinator.sync([newOwnerTarget], true);
    oldOwnerRequest.resolve(createResponse([oldOwnerTarget], ["guild-old"]));

    await vi.waitFor(() => {
      expect(getEntry(newOwnerTarget)).toMatchObject({
        guilds: [{ id: "guild-new", name: "guild-new" }],
        requestKey: newOwnerTarget.requestKey,
        status: "success",
      });
    });
  });

  it("reuses success for 60 seconds and refreshes it on a later activation", async () => {
    const target = createTarget("1");
    let now = 1_000;
    const fetchPlayersCatchingGuilds = vi
      .fn()
      .mockResolvedValue(createResponse([target]));
    const coordinator = new CharacterTooltipCatchingGuildsCoordinator({
      fetchPlayersCatchingGuilds,
      now: () => now,
    });

    coordinator.sync([target], true);
    await vi.waitFor(() => {
      expect(getEntry(target)?.status).toBe("success");
    });
    coordinator.sync([], false);
    coordinator.sync([target], true);
    expect(fetchPlayersCatchingGuilds).toHaveBeenCalledOnce();

    now += CATCHING_GUILDS_CACHE_TIME_MS + 1;
    coordinator.sync([], false);
    coordinator.sync([target], true);

    await vi.waitFor(() => {
      expect(fetchPlayersCatchingGuilds).toHaveBeenCalledTimes(2);
    });
  });

  it("retries an API error on the next Shift activation", async () => {
    const target = createTarget("1");
    const fetchPlayersCatchingGuilds = vi
      .fn()
      .mockRejectedValueOnce(createApiError(400))
      .mockResolvedValueOnce(createResponse([target]));
    const coordinator = new CharacterTooltipCatchingGuildsCoordinator({
      fetchPlayersCatchingGuilds,
    });

    coordinator.sync([target], true);
    await vi.waitFor(() => {
      expect(getEntry(target)?.status).toBe("error");
    });
    coordinator.sync([], false);
    coordinator.sync([target], true);

    await vi.waitFor(() => {
      expect(getEntry(target)?.status).toBe("success");
    });
    expect(fetchPlayersCatchingGuilds).toHaveBeenCalledTimes(2);
  });
});

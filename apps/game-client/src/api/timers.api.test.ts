import { configureApiClients } from "@lootlog/client/transport";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";
import { useLogsStore } from "@/store/logs.store";
import { createAutoTimer, normalizeTimerResponse } from "./timers.api";

const http = vi.fn<typeof fetch>();

const timer = {
  accountId: "1",
  characterId: "2",
  world: "luvia",
  respBaseSeconds: 561,
  respawnRandomness: 15,
  npc: {
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
};

const accepted = {
  submittedGuilds: [{ guildId: "guild-1", guildName: "Guild" }],
  rejectedGuilds: [],
};

beforeEach(() => {
  vi.useFakeTimers();
  http.mockReset();
  useLogsStore.getState().clearActions();
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.example.test",
        fetch: http,
      },
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

it("retries transient auto-timer failures with the original payload in one logged action", async () => {
  http.mockRejectedValueOnce(new TypeError("Network unavailable"));
  http.mockResolvedValueOnce(
    Response.json({ message: "Unavailable" }, { status: 503 }),
  );
  http.mockResolvedValueOnce(Response.json(accepted));

  const result = createAutoTimer(timer);
  await vi.runAllTimersAsync();
  await expect(result).resolves.toEqual(accepted);

  expect(http).toHaveBeenCalledTimes(3);

  const payloads = await Promise.all(
    http.mock.calls.map(async (call) => {
      const request = new Request(...call);
      expect(new URL(request.url).pathname).toBe("/timers/auto");

      return request.json();
    }),
  );

  expect(payloads).toEqual([timer, timer, timer]);
  expect(useLogsStore.getState().actions).toMatchObject([
    {
      actionType: "create_timer",
      status: "success",
      requests: [
        { status: "error" },
        { status: "error", statusCode: 503 },
        { status: "success" },
      ],
    },
  ]);
});

it.each([400, 401, 403])(
  "does not retry an auto-timer rejected with HTTP %s",
  async (status) => {
    http.mockResolvedValue(Response.json({ message: "Rejected" }, { status }));
    await expect(createAutoTimer(timer)).rejects.toMatchObject({ status });
    expect(http).toHaveBeenCalledTimes(1);
    expect(useLogsStore.getState().actions[0]?.status).toBe("error");
  },
);

it("stops after three failed attempts and retains the final failure", async () => {
  http.mockRejectedValue(new TypeError("Network unavailable"));

  const result = createAutoTimer(timer).catch((cause: unknown) => cause);

  await vi.runAllTimersAsync();
  await expect(result).resolves.toMatchObject({
    message: "Network unavailable",
  });
  expect(http).toHaveBeenCalledTimes(3);
  expect(useLogsStore.getState().actions[0]).toMatchObject({
    status: "error",
    requests: [{ status: "error" }, { status: "error" }, { status: "error" }],
  });
});

it("times out hung submissions and finishes three attempts within server deduplication despite late timers", async () => {
  const signals: AbortSignal[] = [];
  http.mockImplementation((input, init) => {
    signals.push(new Request(input, init).signal);
    // Browser timers fire late; exact fake timers would hide a budget that
    // leaves no room for the third attempt.
    vi.setSystemTime(Date.now() + 100);

    return new Promise(() => undefined);
  });
  const startedAt = Date.now();

  const result = createAutoTimer(timer).catch((cause: unknown) => cause);

  await vi.runAllTimersAsync();
  await expect(result).resolves.toMatchObject({
    cause: { name: "TimeoutError" },
  });
  expect(http).toHaveBeenCalledTimes(3);
  expect(signals.every((signal) => signal.aborted)).toBe(true);
  expect(Date.now() - startedAt).toBeLessThan(30_000);
  expect(useLogsStore.getState().actions[0]?.status).toBe("error");
});

it("does not resend a failed timer after tab suspension outlives server deduplication", async () => {
  http.mockRejectedValue(new TypeError("Network unavailable"));

  const result = createAutoTimer(timer).catch((cause: unknown) => cause);

  await vi.advanceTimersByTimeAsync(0);
  expect(http).toHaveBeenCalledTimes(1);
  vi.setSystemTime(Date.now() + 31_000);
  await vi.runAllTimersAsync();
  await expect(result).resolves.toMatchObject({
    message: "Network unavailable",
  });
  expect(http).toHaveBeenCalledTimes(1);
  expect(useLogsStore.getState().actions[0]?.status).toBe("error");
});

it("does not start a retry after the latest attempt start", async () => {
  http.mockImplementation(async () => {
    // Simulate a suspended browser delivering the failed request late.
    vi.setSystemTime(Date.now() + 20_000);
    throw new TypeError("Network unavailable");
  });
  await expect(createAutoTimer(timer)).rejects.toThrow("Network unavailable");
  expect(http).toHaveBeenCalledTimes(1);
});

describe("timers.api", () => {
  it("preserves actor character data when normalizing timer responses", () => {
    const timer = normalizeTimerResponse({
      guildId: "guild-1",
      npcId: 123,
      timerKey: "123:test boss",
      world: "test-world",
      minSpawnTime: "2026-05-03T08:00:00.000Z",
      maxSpawnTime: "2026-05-03T09:00:00.000Z",
      wasReset: false,
      updatedAt: "2026-05-03T07:30:00.000Z",
      npc: {
        id: 123,
        name: "Test Boss",
        prof: "w",
        location: "Test Location",
        wt: "25",
        lvl: 100,
        type: "HERO",
        icon: "icon.png",
        margonemType: "4",
      },
      member: {
        id: 1,
        userId: "discord123",
        guildId: "guild-1",
        type: "OWNER",
        name: "Tester",
        avatar: null,
        banner: null,
        active: true,
        roles: [],
        globalUserId: "global-1",
        lastDiscordSyncAt: null,
        updatedAt: "2026-05-03T07:00:00.000Z",
      },
      actorCharacter: {
        accountId: 200,
        characterId: 100,
        name: "Hero One",
        prof: "BLADE_DANCER",
        icon: "hero.gif",
        lvl: 300,
      },
    });

    expect(timer.actorCharacter).toMatchObject({
      accountId: 200,
      characterId: 100,
      name: "Hero One",
      prof: "BLADE_DANCER",
      icon: "hero.gif",
      lvl: 300,
    });
    expect(timer.actorCharactersByMemberId).toEqual({
      "1": timer.actorCharacter,
    });
  });
});

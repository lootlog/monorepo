import { describe, expect, spyOn, test } from "bun:test";
import { Effect, Exit } from "effect";
import {
  RecordingHub,
  READ,
  session,
  socket,
  numberedSocket,
  joinedOrganizations,
  makeStore,
  publish,
  disconnect,
  readSnapshot,
  flush,
} from "../../test/presence-store-fixtures.js";

const deltaChanges = (hub: RecordingHub, action: "upsert" | "remove") =>
  hub.presenceEvents.flatMap(({ basic }) =>
    basic.type === "presence.delta"
      ? basic.data.changes.filter((change) => change.action === action)
      : [],
  );

describe("PresenceStore", () => {
  test("announces a write that settles after its caller was interrupted", async () => {
    const { redis, hub, store } = makeStore();
    const publisher = socket(session([READ]));
    await publish(store, publisher);
    await flush(store);
    hub.presenceEvents.length = 0;
    const started = Promise.withResolvers<void>();
    const gate = Promise.withResolvers<void>();
    const evaluate = redis.eval.bind(redis);

    spyOn(redis, "eval").mockImplementationOnce(async (...parameters) => {
      started.resolve();
      await gate.promise;

      return evaluate(...parameters);
    });

    const controller = new AbortController();

    const publication = Effect.runPromiseExit(
      store.publish(publisher, {
        organizationIds: joinedOrganizations(publisher),
        isAfk: true,
      }),
      { signal: controller.signal },
    );

    await started.promise;
    controller.abort();
    expect(Exit.isFailure(await publication)).toBe(true);
    gate.resolve();
    await Bun.sleep(0);
    await flush(store);

    expect(deltaChanges(hub, "upsert")).toMatchObject([
      { presence: { sessionId: "session-1", isAfk: true } },
    ]);
  });

  test("a join burst costs one revision per flush and keeps snapshot reads flat", async () => {
    const { redis, hub, store } = makeStore();
    const mget = spyOn(redis, "mget");
    const incr = spyOn(redis, "incr");

    const join = async (index: number) => {
      const joining = numberedSocket(index);
      await publish(store, joining);
      await readSnapshot(store, joining.data);
    };

    for (let index = 0; index < 1_000; index++) {
      await join(index);

      if (index % 100 === 99) await flush(store);
    }

    expect(incr).toHaveBeenCalledTimes(10);
    expect(hub.presenceEvents).toHaveLength(10);
    expect(deltaChanges(hub, "upsert")).toHaveLength(1_000);
    expect(mget).toHaveBeenCalledTimes(10);

    hub.presenceEvents.length = 0;

    for (let index = 1_000; index < 1_250; index++) await join(index);
    await flush(store);

    expect(
      hub.presenceEvents.map(({ basic }) =>
        basic.type === "presence.delta"
          ? [basic.data.revision, basic.data.changes.length]
          : [],
      ),
    ).toEqual([
      [11, 100],
      [12, 100],
      [13, 50],
    ]);
  });

  test("a session's latest change in a batch supersedes its earlier ones", async () => {
    const { hub, store } = makeStore();
    const publisher = socket(session([READ]));
    await publish(store, publisher);
    await publish(store, publisher, { isAfk: true });
    await flush(store);
    expect(deltaChanges(hub, "upsert")).toMatchObject([
      { presence: { sessionId: "session-1", isAfk: true } },
    ]);

    hub.presenceEvents.length = 0;
    await publish(store, publisher, { isAfk: false });
    await disconnect(store, publisher);
    await flush(store);
    expect(hub.presenceEvents).toHaveLength(1);
    expect(deltaChanges(hub, "upsert")).toEqual([]);
    expect(deltaChanges(hub, "remove")).toMatchObject([
      { sessionId: "session-1" },
    ]);
  });

  test("retries a failed delta without overriding a newer change", async () => {
    const { hub, store } = makeStore();
    const first = socket(session([READ]));
    const second = socket({ ...session([READ]), connectionId: "session-2" });
    await publish(store, first);
    await publish(store, second);
    spyOn(hub, "publishPresence").mockImplementationOnce(async () => {
      await disconnect(store, second);
      throw new Error("Redis publish failed");
    });

    await flush(store);
    expect(hub.presenceEvents).toEqual([]);

    await flush(store);
    expect(hub.presenceEvents).toHaveLength(1);
    expect(deltaChanges(hub, "upsert")).toMatchObject([
      { presence: { sessionId: "session-1" } },
    ]);
    expect(deltaChanges(hub, "remove")).toMatchObject([
      { sessionId: "session-2" },
    ]);
  });

  test("an interrupted flush keeps every unpublished change queued", async () => {
    const { hub, store } = makeStore();

    for (let index = 0; index < 250; index++)
      await publish(store, numberedSocket(index));

    const started = Promise.withResolvers<void>();

    spyOn(hub, "publishPresence").mockImplementationOnce(() => {
      started.resolve();

      return new Promise(() => {});
    });

    const controller = new AbortController();

    const flushing = Effect.runPromiseExit(store.flushDeltas, {
      signal: controller.signal,
    });

    await started.promise;
    controller.abort();
    await flushing;
    await flush(store);

    const delivered = new Set(
      deltaChanges(hub, "upsert").map((change) =>
        change.action === "upsert" ? change.presence.sessionId : undefined,
      ),
    );

    expect(delivered.size).toBe(250);
  });
});

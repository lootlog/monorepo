import { expect, test } from "bun:test";
import type { FederatedRealtimeMessage } from "#src/platform/redis-store";
import { useDragonfly } from "./dragonfly-fixtures.js";

const openStore = useDragonfly();

test("a publication replayed by a restarted gateway reaches the federation once", async () => {
  const keyPrefix = `publication:${crypto.randomUUID()}`;
  await using receiver = await openStore(keyPrefix);
  const received: FederatedRealtimeMessage[] = [];
  await receiver.store.subscribe((message) => received.push(message));

  const publication = (sourceInstanceId: string, id = "kill:1") => ({
    id,
    sourceInstanceId,
    userId: "user-1",
  });

  const frames = {
    event: JSON.stringify({
      v: 1,
      type: "kills.changed",
      data: { guildId: "organization-1" },
    }),
  };

  {
    await using publisher = await openStore(keyPrefix);
    expect(
      await publisher.store.publishOnce(publication("before"), frames),
    ).toBe(true);
  }

  await using restarted = await openStore(keyPrefix);
  expect(await restarted.store.publishOnce(publication("after"), frames)).toBe(
    false,
  );
  expect(
    await restarted.store.publishOnce(publication("after", "kill:2"), frames),
  ).toBe(true);

  const deadline = Date.now() + 5_000;

  while (received.length < 2 && Date.now() < deadline) await Bun.sleep(20);

  expect(
    received.map(({ id, sourceInstanceId }) => [id, sourceInstanceId]),
  ).toEqual([
    ["kill:1", "before"],
    ["kill:2", "after"],
  ]);
  expect(
    await restarted.store.command.eval<number>(
      "return redis.call('TTL', KEYS[1])",
      1,
      "realtime:publication:kill:1",
    ),
  ).toBeGreaterThan(3_000);
});

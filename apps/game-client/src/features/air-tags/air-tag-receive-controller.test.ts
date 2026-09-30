import type {
  AirTagScopeSnapshot,
  AirTagScopeUpdateEvent,
  AirTagTarget,
  AirTagUpdateEvent,
} from "@lootlog/schema/air-tag";
import { AirTagReceiveController } from "./air-tag-receive-controller";

const createTarget = (overrides: Partial<AirTagTarget> = {}): AirTagTarget => ({
  targetId: "target-1",
  nickname: "Target",
  relation: 1,
  x: 10,
  y: 10,
  observedAt: 1_000,
  ...overrides,
});

const createSnapshot = (
  overrides: Partial<AirTagScopeSnapshot> = {},
): AirTagScopeSnapshot => ({
  guildId: "guild-1",
  world: "aether",
  mapId: 42,
  epochId: "epoch-a",
  epochStartedAt: 100,
  revision: 3,
  targets: [createTarget()],
  ...overrides,
});

const createUpdate = (
  overrides: Partial<AirTagUpdateEvent> = {},
): AirTagUpdateEvent => ({
  guildId: "guild-1",
  world: "aether",
  mapId: 42,
  epochId: "epoch-a",
  epochStartedAt: 100,
  revision: 4,
  target: createTarget({ x: 14, observedAt: 2_000 }),
  ...overrides,
});

const createScopeUpdate = (
  overrides: Partial<AirTagScopeUpdateEvent> = {},
): AirTagScopeUpdateEvent => ({
  guildId: "guild-1",
  world: "aether",
  mapId: 42,
  epochId: "epoch-a",
  epochStartedAt: 100,
  revision: 4,
  targets: [],
  removedTargetIds: [],
  ...overrides,
});

describe("AirTagReceiveController", () => {
  it("removes a departed target and keeps a late frame of another gateway from restoring it", () => {
    const controller = new AirTagReceiveController(() => 2_000);
    controller.beginSubscription("request-1", "aether", 42);
    controller.applySubscriptionAck({
      status: "accepted",
      requestId: "request-1",
      scopes: [
        createSnapshot({
          targets: [createTarget(), createTarget({ targetId: "target-2" })],
        }),
      ],
    });

    controller.handleScopeUpdate(
      createScopeUpdate({
        revision: 6,
        targets: [
          createTarget({ targetId: "target-2", x: 30, observedAt: 2_000 }),
        ],
        removedTargetIds: ["target-1"],
      }),
    );
    // Merged earlier, delivered later by another gateway instance.
    controller.handleScopeUpdate(
      createScopeUpdate({
        revision: 5,
        targets: [
          createTarget({ x: 12, observedAt: 1_900 }),
          createTarget({ targetId: "target-2", x: 20, observedAt: 1_900 }),
          createTarget({ targetId: "target-3", observedAt: 1_900 }),
        ],
      }),
    );

    expect(controller.getRenderableTargets(2_100, 10_000)).toEqual([
      expect.objectContaining({ targetId: "target-2", x: 30 }),
      expect.objectContaining({ targetId: "target-3" }),
    ]);
  });

  it("hides a player the hero saw leave, but only until the gateway could have removed them", () => {
    let now = 2_000;
    const controller = new AirTagReceiveController(() => now);
    controller.beginSubscription("request-1", "aether", 42);
    controller.applySubscriptionAck({
      status: "accepted",
      requestId: "request-1",
      scopes: [createSnapshot()],
    });

    controller.hideDeparted("target-1");
    expect(controller.getRenderableTargets(now, 10_000)).toEqual([]);

    // Another member still reports the player: the hero's guess was wrong.
    now = 5_000;
    expect(controller.getRenderableTargets(now, 10_000)).toEqual([
      expect.objectContaining({ targetId: "target-1" }),
    ]);
  });

  it("retains at most the 100 freshest targets in each scope", () => {
    const controller = new AirTagReceiveController();
    controller.beginSubscription("request-1", "aether", 42);
    controller.applySubscriptionAck({
      status: "accepted",
      requestId: "request-1",
      scopes: [
        createSnapshot({
          targets: Array.from({ length: 105 }, (_, index) =>
            createTarget({
              targetId: `target-${index}`,
              observedAt: index,
            }),
          ),
        }),
      ],
    });

    const targets = controller.getRenderableTargets(105, 10_000);

    expect(targets).toHaveLength(100);
    expect(targets.some((target) => target.targetId === "target-0")).toBe(
      false,
    );
    expect(targets.some((target) => target.targetId === "target-104")).toBe(
      true,
    );
  });

  it("applies queued deltas newer than the subscription snapshot", () => {
    const controller = new AirTagReceiveController(() => 2_000);
    controller.beginSubscription("request-1", "aether", 42);
    controller.handleUpdate(createUpdate());
    controller.applySubscriptionAck({
      status: "accepted",
      requestId: "request-1",
      scopes: [createSnapshot()],
    });

    expect(controller.getRenderableTargets(2_100, 10_000)).toEqual([
      expect.objectContaining({ x: 14, observedAt: 2_000 }),
    ]);
  });

  it("measures marker age on the local clock when it runs a minute ahead of the gateway", () => {
    let now = 61_000;
    const controller = new AirTagReceiveController(() => now);
    controller.beginSubscription("request-1", "aether", 42);
    controller.applySubscriptionAck({
      status: "accepted",
      requestId: "request-1",
      scopes: [
        createSnapshot({
          serverTime: 1_500,
          targets: [createTarget({ observedAt: 1_000 })],
        }),
      ],
    });
    expect(controller.getRenderableTargets(now, 10_000)).toEqual([
      expect.objectContaining({ observedAt: 60_500 }),
    ]);

    now = 62_000;
    controller.handleUpdate(
      createUpdate({ target: createTarget({ x: 14, observedAt: 3_000 }) }),
    );
    expect(controller.getRenderableTargets(now + 9_000, 10_000)).toEqual([
      expect.objectContaining({ x: 14, observedAt: 62_000 }),
    ]);
  });

  it("ignores stale acknowledgements and stale revisions", () => {
    const controller = new AirTagReceiveController();
    controller.beginSubscription("current", "aether", 42);
    controller.applySubscriptionAck({
      status: "accepted",
      requestId: "stale",
      scopes: [createSnapshot({ targets: [createTarget({ x: 99 })] })],
    });
    controller.applySubscriptionAck({
      status: "accepted",
      requestId: "current",
      scopes: [createSnapshot()],
    });
    controller.handleUpdate(createUpdate({ revision: 3 }));

    expect(controller.getRenderableTargets(1_100, 10_000)).toEqual([
      expect.objectContaining({ x: 10 }),
    ]);
  });

  it("accepts a lower revision from a newer room epoch", () => {
    const controller = new AirTagReceiveController();
    controller.beginSubscription("request-1", "aether", 42);
    controller.applySubscriptionAck({
      status: "accepted",
      requestId: "request-1",
      scopes: [createSnapshot({ revision: 200 })],
    });
    controller.handleUpdate(
      createUpdate({
        epochId: "epoch-b",
        epochStartedAt: 200,
        revision: 1,
        target: createTarget({ x: 30, observedAt: 3_000 }),
      }),
    );
    controller.handleUpdate(
      createUpdate({
        epochId: "epoch-a",
        epochStartedAt: 100,
        revision: 201,
        target: createTarget({ x: 99, observedAt: 3_100 }),
      }),
    );

    expect(controller.getRenderableTargets(3_100, 10_000)).toEqual([
      expect.objectContaining({ x: 30 }),
    ]);
  });

  it("merges duplicate guild targets into one freshest render target", () => {
    const controller = new AirTagReceiveController();
    controller.beginSubscription("request-1", "aether", 42);
    controller.applySubscriptionAck({
      status: "accepted",
      requestId: "request-1",
      scopes: [
        createSnapshot({
          targets: [
            createTarget({ enemyObservedAt: 1_500, observedAt: 1_500 }),
          ],
        }),
        createSnapshot({
          guildId: "guild-2",
          targets: [
            createTarget({
              x: 20,
              observedAt: 2_000,
              clanEnemyObservedAt: 1_800,
            }),
          ],
        }),
      ],
    });

    expect(controller.getRenderableTargets(2_100, 10_000)).toEqual([
      expect.objectContaining({
        x: 20,
        enemyObservedAt: 1_500,
        clanEnemyObservedAt: 1_800,
      }),
    ]);
  });

  it("drops expired targets and malformed runtime updates", () => {
    const controller = new AirTagReceiveController();
    controller.beginSubscription("request-1", "aether", 42);
    controller.applySubscriptionAck({
      status: "accepted",
      requestId: "request-1",
      scopes: [createSnapshot()],
    });
    controller.handleUpdate({ mapId: 42, target: {} });

    expect(controller.getRenderableTargets(11_000, 10_000)).toEqual([]);
  });
});

it("prunes revoked scopes during an in-flight refresh without clearing unrelated targets", () => {
  const controller = new AirTagReceiveController();

  const snapshots = [
    createSnapshot(),
    createSnapshot({
      guildId: "guild-2",
      targets: [createTarget({ targetId: "target-2", nickname: "Other" })],
    }),
  ];

  controller.beginSubscription("initial", "aether", 42);
  controller.applySubscriptionAck({
    status: "accepted",
    requestId: "initial",
    scopes: snapshots,
  });
  controller.beginSubscription("refresh", "aether", 42, true);
  expect(controller.getRenderableTargets(1100, 10000)).toHaveLength(2);
  controller.retainOrganizations(new Set(["guild-2"]));
  expect(controller.getRenderableTargets(1100, 10000)).toEqual([
    expect.objectContaining({ targetId: "target-2" }),
  ]);
  controller.handleUpdate(createUpdate());
  controller.applySubscriptionAck({
    status: "accepted",
    requestId: "refresh",
    scopes: snapshots,
  });
  expect(controller.getRenderableTargets(1100, 10000)).toEqual([
    expect.objectContaining({ targetId: "target-2" }),
  ]);
});

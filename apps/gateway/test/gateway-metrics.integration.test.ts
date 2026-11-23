import { expect, test } from "bun:test";
import { Effect } from "effect";
import { GatewayMetrics } from "#src/realtime/gateway-metrics";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import { useDragonfly } from "./dragonfly-fixtures.js";
import {
  hubConfig,
  makeAdminSession,
  makeGamePresence,
  makeTestSocket,
  unusedFederationStore,
} from "./realtime-fixtures.js";

const openStore = useDragonfly();

const SNAPSHOTS = "realtime:metrics:instances:v2";

test("global chat counts a User once across replicas and still adds replicas of the previous release", async () => {
  await using redis = await openStore(`metrics:${crypto.randomUUID()}`);

  const replica = (connectionId: string) => {
    const hub = new RealtimeHub(hubConfig, unusedFederationStore);

    const session = makeAdminSession(connectionId, {
      discordId: "discord-shared",
      userId: "user-shared",
      platform: "game",
    });

    session.presence = makeGamePresence(session, "tempest");
    const { socket } = makeTestSocket(session);
    hub.register(socket);
    hub.subscribe(socket, { topic: "global.chat" });
    hub.subscribe(socket, { topic: "global.chat.world", world: "tempest" });

    return {
      hub,
      metrics: new GatewayMetrics(redis.store.command, hub, () => 1),
    };
  };

  await redis.store.command.eval(
    `
      local time = redis.call('TIME')
      redis.call('HSET', KEYS[1], 'previous-release', cjson.encode({
        at = tonumber(time[1]) * 1000,
        connections = 3,
        sessions = 3,
        players = {'discord-previous-1', 'discord-previous-2', 'discord-previous-3'},
        globalChatListeners = {[''] = 2, tempest = 1},
        worldPlayers = {tempest = 3},
      }))
      return 1
    `,
    1,
    SNAPSHOTS,
  );

  const first = replica("first");
  const second = replica("second");
  await Effect.runPromise(first.metrics.sample());
  await Effect.runPromise(second.metrics.sample());

  expect(second.hub.globalChatCounts).toEqual({
    online: 4,
    playersByWorld: { tempest: 4 },
    listeners: { "": 3, tempest: 2 },
  });
});

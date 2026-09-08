import { unusedFederationStore } from "../../test/realtime-fixtures.js";
import { createRabbitDelivery } from "../../test/rabbit-fixtures.js";
import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import type {
  RabbitDelivery,
  RabbitMessagingService,
} from "@lootlog/messaging";
import { decodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import type { SessionData } from "#src/realtime/session";
import { RabbitBridge } from "./rabbit-bridge.js";

describe("volunteer delivery", () => {
  test("delivers a guildless volunteer privately to the organizer", async () => {
    const handlers = new Map<
      string,
      (delivery: RabbitDelivery) => Effect.Effect<void, unknown>
    >();
    const messaging: RabbitMessagingService = {
      publish: () => Effect.void,
      ack: () => Effect.void,
      nack: () => Effect.void,
      consume: (options, handler) =>
        Effect.sync(() => {
          handlers.set(options.queue, handler);
          return { consumerTag: options.queue, cancel: Effect.void };
        }),
    };
    const hub = new RealtimeHub(
      {
        maxBackpressureBytes: 1024,
        maxBackpressureStrikes: 3,
      },
      { ...unusedFederationStore, publish: () => Promise.resolve() },
      () => {},
    );
    const targets = ["organizer", "other-member", "legacy-organizer"].map(
      (connectionId) => {
        const discordId =
          connectionId === "legacy-organizer" ? "organizer" : connectionId;
        const frames: Uint8Array[] = [];
        const session: SessionData = {
          discordId,
          userId: discordId,
          connectionId,
          supportsNotificationVolunteer: connectionId !== "legacy-organizer",
          platform: "game",
          joined: true,
          guilds: [],
          subscriptions: new Map(),
          airTagScopes: [],
          confidence: "reported",
          backpressureStrikes: 0,
        };
        hub.register({
          data: session,
          getBufferedAmount: () => 0,
          send: (frame: Uint8Array) => {
            frames.push(frame);
            return frame.byteLength;
          },
          close: () => {},
        });
        return frames;
      },
    );
    const unexpected = () => {
      throw new Error("Unexpected control call");
    };
    const bridge = new RabbitBridge(
      messaging,
      hub,
      { rebalanceAcrossInstances: unexpected },
      { coverageForMap: unexpected },
      { publish: unexpected },
    );
    const character = {
      nick: "Volunteer",
      lvl: 250,
      accountId: "account",
      characterId: "character",
      prof: "w",
      icon: "icon.gif",
      clan: { id: 1, name: "Clan" },
    };
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          yield* bridge.start();
          const handle = handlers.get("gateway-guilds-notifications-volunteer");
          if (!handle) throw new Error("Missing volunteer consumer");
          yield* handle(
            createRabbitDelivery(
              "guilds.notifications.volunteer",
              Buffer.from(
                JSON.stringify({
                  notificationId: "notification",
                  targetDiscordId: "organizer",
                  volunteerDiscordId: "volunteer",
                  world: "tempest",
                  character,
                }),
              ),
              "volunteer-delivery",
            ),
          );
        }),
      ),
    );
    expect(targets[0]?.map(decodeRealtimeFrame)).toEqual([
      {
        v: 1,
        type: "notification.volunteer",
        data: {
          notificationId: "notification",
          volunteer: { ...character, discordId: "volunteer", world: "tempest" },
        },
      },
    ]);
    expect(targets[1]).toEqual([]);
    expect(targets[2]).toEqual([]);
  });
});

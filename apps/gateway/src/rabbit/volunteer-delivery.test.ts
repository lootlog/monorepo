import {
  makeSession,
  makeTestSocket,
  unusedFederationStore,
} from "../../test/realtime-fixtures.js";
import { makeRabbitBridgeHarness } from "../../test/rabbit-fixtures.js";
import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { decodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import { RealtimeHub } from "#src/realtime/realtime-hub";

describe("volunteer delivery", () => {
  test("delivers a guildless volunteer privately to the organizer", async () => {
    const hub = new RealtimeHub(
      { maxBackpressureBytes: 1024 },
      { ...unusedFederationStore, publish: () => Promise.resolve() },
      () => {},
    );

    const [organizer, otherMember] = ["organizer", "other-member"].map(
      (discordId) => {
        const target = makeTestSocket(
          makeSession({
            discordId,
            userId: discordId,
            connectionId: discordId,
            platform: "game",
          }),
        );

        hub.register(target.socket);

        return target;
      },
    );

    const { bridge, deliver } = makeRabbitBridgeHarness(hub);

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
        bridge.start().pipe(
          Effect.andThen(() =>
            deliver(
              "guilds.notifications.volunteer",
              {
                notificationId: "notification",
                targetDiscordId: "organizer",
                volunteerDiscordId: "volunteer",
                world: "tempest",
                character,
              },
              { messageId: "volunteer-delivery" },
            ),
          ),
        ),
      ),
    );
    expect(organizer?.sent.map(decodeRealtimeFrame)).toEqual([
      {
        v: 1,
        type: "notification.volunteer",
        data: {
          notificationId: "notification",
          volunteer: { ...character, discordId: "volunteer", world: "tempest" },
        },
      },
    ]);
    expect(otherMember?.sent).toEqual([]);
  });
});

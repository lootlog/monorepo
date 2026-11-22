import { describe, expect, it } from "bun:test";
import type { LootDrawResolvedNotificationEvent } from "@lootlog/schema/notifications";
import { Effect } from "effect";
import { makeNotificationImages } from "#src/notifications/content/notification-images";

const lootDraw: LootDrawResolvedNotificationEvent = {
  guildId: "guild-1",
  world: "fobos",
  lootId: 77,
  outcome: "DRAWN",
  item: { hid: "hid", name: "Ślepie demona", icon: "nas/1.gif", lvl: 200 },
  npcName: null,
  draw: {
    id: 5,
    entrants: [
      { name: "Kaliandra", prof: "MAGE", lvl: 251, tickets: 3 },
      { name: "Grimm", prof: "WARRIOR", lvl: 248, tickets: 1 },
    ],
    winnerIndex: 1,
    drawnBy: "Wrona",
    voided: null,
  },
};

describe("notification images", () => {
  it("attaches a loot draw's wheel to its message", async () => {
    const images = makeNotificationImages({
      render: () => Effect.succeed(Buffer.from("png")),
    });

    expect(await Effect.runPromise(images.filesFor({ lootDraw }))).toEqual([
      {
        name: "lootlog-kolo.png",
        contentType: "image/png",
        base64: Buffer.from("png").toString("base64"),
      },
    ]);
  });

  it("sends the message without the wheel when it cannot be drawn", async () => {
    const images = makeNotificationImages({
      render: () => Effect.fail(new Error("sharp crashed")),
    });

    expect(await Effect.runPromise(images.filesFor({ lootDraw }))).toEqual([]);
  });

  it("draws nothing for a message that is not about a draw", async () => {
    const images = makeNotificationImages({
      render: () => Effect.die("no draw to render"),
    });

    expect(
      await Effect.runPromise(images.filesFor({ content: "Tanroth" })),
    ).toEqual([]);
  });
});

import { Schema } from "effect";
import {
  NotificationOwnerType,
  NotificationProvider,
  NotificationTargetType,
} from "@lootlog/schema/notifications";
import { describe, expect, it } from "bun:test";
import { decodeNotificationCommand } from "./bot-application.js";

describe("Discord notification command decoding", () => {
  it("rejects malformed JSON without throwing", () => {
    expect(
      decodeNotificationCommand(new TextEncoder().encode("not-json")),
    ).toBeUndefined();
  });
});

const notification = {
  notificationJobId: "job",
  provider: NotificationProvider.DISCORD,
  ownerType: NotificationOwnerType.GUILD,
  ownerId: "guild",
  title: "Alert",
  message: "Boss spawned",
  target: {
    targetId: "target",
    externalId: "channel",
    targetType: NotificationTargetType.CHANNEL,
  },
};

const decode = (payload: typeof Schema.Json.Type) =>
  decodeNotificationCommand(new TextEncoder().encode(JSON.stringify(payload)));

it("preserves notification content, mentions and extension fields", () => {
  const input = {
    ...notification,
    content: "<@&1> Boss",
    allowedMentions: { roles: ["1"] },
    metadata: { source: "timer" },
    extension: true,
  };

  expect(decode(input)).toEqual(input);
});

it("preserves title/message fallback for legacy non-string content", () => {
  expect(decode({ ...notification, content: 42 })).toEqual(notification);
});

it("rejects invalid optional mentions instead of treating them as a checked command", () => {
  expect(
    decode({ ...notification, allowedMentions: { roles: [42] } }),
  ).toBeUndefined();
});

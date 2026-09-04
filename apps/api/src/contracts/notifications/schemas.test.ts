import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import {
  CreateNotificationRuleRequest,
  UpdateNotificationRuleRequest,
} from "./schemas.js";

describe("notification rule contracts", () => {
  it("requires world and NPC targeting for applicable rules while allowing scheduled messages without a world", () => {
    const decode = Schema.decodeUnknownSync(CreateNotificationRuleRequest);
    expect(
      decode({
        triggerType: "SCHEDULED_MESSAGE",
        targetIds: [1],
        scheduledAt: "2026-09-04T12:00:00+02:00",
      }),
    ).toMatchObject({
      triggerType: "SCHEDULED_MESSAGE",
      targetIds: [1],
      scheduledAt: "2026-09-04T12:00:00+02:00",
    });
    expect(() =>
      decode({ triggerType: "NPC_SPAWNED", targetIds: [1] }),
    ).toThrow();
    expect(() =>
      decode({
        triggerType: "NPC_SPAWNED",
        world: "world",
        npcIds: [],
        targetIds: [1],
      }),
    ).toThrow();
    expect(() =>
      decode({ triggerType: "SCHEDULED_MESSAGE", targetIds: [1, 2, 3, 4] }),
    ).toThrow();
    expect(() =>
      decode({ triggerType: "SCHEDULED_MESSAGE", targetIds: ["1"] }),
    ).toThrow();
  });

  it("allows a partial rule update but rejects blank world and out-of-range schedule values", () => {
    const decode = Schema.decodeUnknownSync(UpdateNotificationRuleRequest);
    expect(decode({ enabled: false, unsupported: true })).toEqual({
      enabled: false,
    });
    expect(() => decode({ world: "  " })).toThrow();
    expect(() => decode({ scheduleWeekday: 7 })).toThrow();
    expect(() => decode({ scheduleOffsetMinutes: 1441 })).toThrow();
  });
});

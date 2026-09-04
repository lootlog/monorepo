import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import {
  CreateEventRequest,
  EventMemberKillHistoryResponse,
} from "./schemas.js";

const member = { id: 1, name: "Member", avatar: null, userId: "user-1" };
const history = {
  member,
  data: [
    {
      id: "kill-1",
      heroNpcId: "hero-1",
      killedAt: "2026-01-01T00:00:00Z",
      minSpawnTimeAtKill: "2026-01-01T00:00:00Z",
      maxSpawnTimeAtKill: "2026-01-01T01:00:00Z",
      isManualClose: false,
      heroNpc: {
        id: "hero-1",
        npcId: null,
        npcName: "Hero",
        npcIcon: null,
        npcLvl: null,
      },
      memberPoint: {
        id: "point-1",
        memberId: 1,
        points: 1.25,
        basePoints: 1,
        trackingDurationSeconds: null,
        trackingDurationPercentage: null,
        timeOnMapSeconds: 30,
        afkPercentage: 0,
        wasPresent: true,
        bonusBreakdown: {
          nested: [{ points: 0.25, reasons: [null, "bonus"] }],
        },
        member,
        metadata: { revision: 1 },
      },
    },
  ],
  nextCursor: null,
} satisfies typeof EventMemberKillHistoryResponse.Type;

describe("event contracts", () => {
  it("preserves nested scoring JSON and extra point metadata without weakening point validation", () => {
    expect(
      Schema.decodeUnknownSync(EventMemberKillHistoryResponse)(history),
    ).toEqual(history);
    expect(() =>
      Schema.decodeUnknownSync(EventMemberKillHistoryResponse)({
        ...history,
        data: [{ ...history.data[0], memberPoint: { bonusBreakdown: {} } }],
      }),
    ).toThrow();
  });

  it("rejects event creation with an end before its start", () => {
    expect(() =>
      Schema.decodeUnknownSync(CreateEventRequest)({
        name: "Event",
        world: "test",
        startsAt: "2026-01-02T00:00:00Z",
        endsAt: "2026-01-01T00:00:00Z",
      }),
    ).toThrow();
  });
});

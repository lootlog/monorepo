import { EventKillHistoryResponseDto } from "./event-kill-response.dto";

describe("EventKillHistoryResponseDto", () => {
  it("encodes cached map data dates as ISO strings", () => {
    const assignedAt = new Date("2026-06-19T10:00:00.000Z");
    const encoded = EventKillHistoryResponseDto.schema.encode({
      data: [
        {
          id: "kill-1",
          heroNpcId: "hero-1",
          killedAt: new Date("2026-06-19T11:00:00.000Z"),
          minSpawnTimeAtKill: new Date("2026-06-19T09:00:00.000Z"),
          maxSpawnTimeAtKill: new Date("2026-06-19T12:00:00.000Z"),
          isManualClose: false,
          heroNpc: {
            id: "hero-1",
            npcId: 1,
            npcName: "Hero",
            npcIcon: null,
            npcLvl: 300,
          },
          points: [
            {
              id: "point-1",
              memberId: 1,
              points: 1,
              basePoints: 1,
              manualAdjustmentPoints: null,
              trackingDurationSeconds: null,
              trackingDurationPercentage: null,
              timeOnMapSeconds: 60,
              afkPercentage: 0,
              wasPresent: true,
              bonusBreakdown: null,
              member: {
                id: 1,
                name: "Member",
                avatar: null,
                userId: "user-1",
              },
              mapData: [
                {
                  mapId: "map-1",
                  mapName: "Map 1",
                  assignedAt,
                  unassignedAt: null,
                  assignmentDurationSeconds: 60,
                  presenceTimeSeconds: 60,
                  afkTimeSeconds: 0,
                },
              ],
            },
          ],
        },
      ],
      nextCursor: null,
    });

    expect(encoded.data[0]?.points[0]?.mapData?.[0]?.assignedAt).toBe(
      "2026-06-19T10:00:00.000Z",
    );
  });
});

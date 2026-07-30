import { describe, expect, it } from "vitest";
import type { EventMap } from "../../types/api";
import { getMapStatus, STATUS_STYLES } from "./map-card";

const assignedMap = {
  id: "map-1",
  mapId: 2354,
  mapName: "Sala Mroźnych Szeptów",
  assignedMembers: [
    {
      id: 8112,
      userId: "user-1",
      name: "Wild",
      avatar: null,
    },
  ],
} as EventMap;

describe("map card status", () => {
  it("shows an assigned map without present players as orange", () => {
    const status = getMapStatus(assignedMap, new Map());

    expect(status).toBe("ASSIGNED_ABSENT");
    expect(STATUS_STYLES[status]).toMatchObject({
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      dot: "bg-orange-500",
    });
  });

  it("keeps an assigned map orange while presence is unavailable", () => {
    const status = getMapStatus(assignedMap);

    expect(status).toBe("ASSIGNED_UNKNOWN");
    expect(STATUS_STYLES[status]).toMatchObject({
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      dot: "bg-orange-500",
    });
  });
});

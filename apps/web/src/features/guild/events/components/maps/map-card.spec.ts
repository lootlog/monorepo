import { describe, expect, it } from "vitest";
import type { EventMap } from "../../types/api";
import { getMapStatus, STATUS_STYLES } from "./map-status";

const assignedMap: EventMap = {
  locationId: "location-1",
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
};

describe("map card status", () => {
  it("treats an assigned map without present players as absent", () => {
    expect(getMapStatus(assignedMap, new Map())).toBe("ASSIGNED_ABSENT");
  });

  it("shows unavailable presence the same way as absent players", () => {
    const status = getMapStatus(assignedMap);

    expect(status).toBe("ASSIGNED_UNKNOWN");
    expect(STATUS_STYLES[status]).toEqual(STATUS_STYLES.ASSIGNED_ABSENT);
  });

  it("keeps an unassigned map visually distinct from an absent one", () => {
    const unassignedMap = { ...assignedMap, assignedMembers: [] };
    const status = getMapStatus(unassignedMap, new Map());

    expect(status).toBe("UNASSIGNED");
    expect(STATUS_STYLES[status].bg).not.toBe(STATUS_STYLES.ASSIGNED_ABSENT.bg);
  });
});

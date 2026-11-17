import { describe, expect, it } from "vitest";
import type { EventMap } from "../../types/api";
import { getMapStatus } from "./map-status";

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

  it("reports unknown presence when presence data is unavailable", () => {
    expect(getMapStatus(assignedMap)).toBe("ASSIGNED_UNKNOWN");
  });

  it("treats a map without assigned members as unassigned", () => {
    expect(
      getMapStatus({ ...assignedMap, assignedMembers: [] }, new Map()),
    ).toBe("UNASSIGNED");
  });
});

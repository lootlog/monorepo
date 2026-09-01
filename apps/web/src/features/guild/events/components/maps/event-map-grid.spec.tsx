// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EventMap, EventMapLocation } from "../../types/api";
import { EventMapGrid } from "./event-map-grid";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/hooks/api/use-guild-permissions", () => ({
  useGuildPermissions: () => ({
    data: { allows: () => false, allowsAny: () => false },
  }),
}));

vi.mock("./map-card", () => ({
  getMapStatus: () => "UNASSIGNED",
  MapCard: ({ map }: { map: EventMap }) => (
    <div data-map-row={map.id}>{map.mapName}</div>
  ),
  STATUS_STYLES: {
    UNASSIGNED: {},
  },
}));

const eventMap: EventMap = {
  id: "map-1",
  mapId: 2310,
  mapName: "Moczary Rybiego Oka",
  locationId: "location-1",
  assignedMembers: [],
};

const location: EventMapLocation = {
  id: "location-1",
  name: "Mazury",
  order: 0,
  maps: [eventMap],
};

describe("EventMapGrid location sections", () => {
  afterEach(cleanup);

  it("hides collapsed map rows without unmounting them", () => {
    render(<EventMapGrid locations={[location]} maps={[]} vertical />);

    const locationToggle = screen.getByRole("button", { name: /Mazury/ });
    const mapRow = screen.getByText("Moczary Rybiego Oka");

    fireEvent.click(locationToggle);

    const collapsedContent = mapRow.closest("[data-map-location-content]");
    expect(mapRow.isConnected).toBe(true);
    expect(collapsedContent).not.toBeNull();
    expect(collapsedContent?.hasAttribute("hidden")).toBe(true);
    expect(collapsedContent?.className).toContain("hidden");
    expect(collapsedContent?.className.split(" ")).not.toContain("flex");

    fireEvent.click(locationToggle);

    expect(screen.getByText("Moczary Rybiego Oka")).toBe(mapRow);
    expect(mapRow.closest("[hidden]")).toBeNull();
    expect(
      mapRow.closest("[data-map-location-content]")?.className.split(" "),
    ).toContain("flex");
  });
});

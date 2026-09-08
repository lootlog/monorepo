import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getGuildsControllerGetGuildPermissionsQueryKey } from "@lootlog/client/main";
import { createOrganizationTestRouter } from "@/lib/testing/router";
// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, onTestFinished } from "vitest";
import type { EventMap, EventMapLocation } from "../../types/api";
import { EventMapGrid } from "./event-map-grid";

await initializeTestTranslations();

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

  it("hides collapsed map rows without unmounting them", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      getGuildsControllerGetGuildPermissionsQueryKey({ guildId: "guild-1" }),
      [],
    );
    onTestFinished(() => queryClient.clear());
    const router = createOrganizationTestRouter(
      <QueryClientProvider client={queryClient}>
        <EventMapGrid locations={[location]} maps={[]} vertical />
      </QueryClientProvider>,
    );
    await router.load();
    render(<RouterProvider router={router} />);

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

import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../prisma/contract.js";
import { PERMISSIONS_KEY } from "#src/shared/permissions/permissions.decorator";
import { mockFn } from "#src/test/mock-fn";
import { EventsMonitoringController } from "./events-monitoring.controller.js";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Permission"]["values"][number];

describe("EventsMonitoringController", () => {
  const mockEventsService = {
    getCoordination: mockFn(),
    getHeroWithAccessCheck: mockFn(),
    getKillTimelineData: mockFn(),
    getHeroCoverageGaps: mockFn(),
    getMapCoverageGaps: mockFn(),
    getActiveGapForMap: mockFn(),
    getActiveGapsForHero: mockFn(),
    getHeroPresenceStats: mockFn(),
    getHeroRespawnConfig: mockFn(),
    closeRespawnWindow: mockFn(),
    openRespawnWindow: mockFn(),
  };

  let controller: EventsMonitoringController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new EventsMonitoringController(mockEventsService as never);
  });

  it("declares permissions metadata for read and manage monitoring endpoints", () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        EventsMonitoringController.prototype.getCoordination,
      ),
    ).toEqual([Permission.LOOTLOG_EVENTS_READ]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        EventsMonitoringController.prototype.getKillTimelineData,
      ),
    ).toEqual([Permission.LOOTLOG_EVENTS_READ]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        EventsMonitoringController.prototype.closeRespawnWindow,
      ),
    ).toEqual([Permission.LOOTLOG_EVENTS_MANAGE]);
  });

  it("returns event coordination data", async () => {
    mockEventsService.getCoordination.mockResolvedValue({
      eventId: "event-1",
      heroes: [],
    });

    await controller.getCoordination({ id: "guild-1" }, "event-1");

    expect(mockEventsService.getCoordination).toHaveBeenCalledWith(
      "guild-1",
      "event-1",
    );
  });

  it("checks hero visibility before returning timeline data", async () => {
    mockEventsService.getKillTimelineData.mockResolvedValue([
      { id: "timeline-1" },
    ]);

    await controller.getKillTimelineData(
      { id: "guild-1" },
      "event-1",
      "hero-1",
      "kill-1",
      [] as never,
      [Permission.LOOTLOG_EVENTS_READ],
    );

    expect(mockEventsService.getHeroWithAccessCheck).toHaveBeenCalledWith(
      "guild-1",
      "event-1",
      "hero-1",
      [],
      [Permission.LOOTLOG_EVENTS_READ],
    );
    expect(mockEventsService.getKillTimelineData).toHaveBeenCalledWith(
      "guild-1",
      "event-1",
      "hero-1",
      "kill-1",
    );
  });

  it("wraps opened respawn windows in a success response", async () => {
    mockEventsService.openRespawnWindow.mockResolvedValue({
      minSpawnTime: new Date("2026-04-22T10:00:00.000Z"),
      maxSpawnTime: new Date("2026-04-22T11:00:00.000Z"),
    });

    await expect(
      controller.openRespawnWindow({ id: "guild-1" }, "event-1", "hero-1", {
        minSpawnTime: "2026-04-22T10:00:00.000Z",
        maxSpawnTime: "2026-04-22T11:00:00.000Z",
      }),
    ).resolves.toEqual({
      success: true,
      minSpawnTime: new Date("2026-04-22T10:00:00.000Z"),
      maxSpawnTime: new Date("2026-04-22T11:00:00.000Z"),
    });
  });
});

import { Permission } from "src/generated/prisma/client";
import { PERMISSIONS_KEY } from "src/shared/permissions/permissions.decorator";
import { EventsCatalogController } from "./events-catalog.controller";

describe("EventsCatalogController", () => {
  const mockEventsService = {
    createEvent: vi.fn(),
    getEvents: vi.fn(),
    getEvent: vi.fn(),
    getEventOverview: vi.fn(),
    getWrapped: vi.fn(),
    getEventMaps: vi.fn(),
    filterEventsHeroesByLevel: vi.fn(),
    filterEventHeroesByLevel: vi.fn(),
    updateEvent: vi.fn(),
    recalculateEventPointsForEvent: vi.fn(),
    deleteEvent: vi.fn(),
  };

  let controller: EventsCatalogController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new EventsCatalogController(mockEventsService as never);
  });

  it("declares permissions metadata for read/manage/owner-admin endpoints", () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        EventsCatalogController.prototype.createEvent,
      ),
    ).toEqual([Permission.LOOTLOG_EVENTS_MANAGE]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        EventsCatalogController.prototype.getEvent,
      ),
    ).toEqual([Permission.LOOTLOG_EVENTS_READ]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        EventsCatalogController.prototype.deleteEvent,
      ),
    ).toEqual([Permission.OWNER, Permission.ADMIN]);
  });

  it("filters events by visible heroes after loading them", async () => {
    const events = [{ id: "event-1" }];
    const filtered = [{ id: "event-1", heroNpcs: [] }];
    mockEventsService.getEvents.mockResolvedValue(events);
    mockEventsService.filterEventsHeroesByLevel.mockReturnValue(filtered);

    await expect(
      controller.getEvents(
        { id: "guild-1" },
        "berufs",
        undefined,
        [{ id: "role-1" }] as never,
        [Permission.LOOTLOG_EVENTS_READ],
      ),
    ).resolves.toEqual(filtered);

    expect(mockEventsService.getEvents).toHaveBeenCalledWith(
      "guild-1",
      "berufs",
      true,
    );
    expect(mockEventsService.filterEventsHeroesByLevel).toHaveBeenCalledWith(
      events,
      [{ id: "role-1" }],
      [Permission.LOOTLOG_EVENTS_READ],
    );
  });

  it("passes guild, event id, permissions and roles to wrapped view", () => {
    const guild = { id: "guild-1" };
    const permissions = [Permission.LOOTLOG_EVENTS_READ];
    const roles = [{ id: "role-1" }];

    controller.getWrapped(
      "viewer-1",
      guild as never,
      "event-1",
      roles as never,
      permissions,
    );

    expect(mockEventsService.getWrapped).toHaveBeenCalledWith(
      guild,
      "viewer-1",
      "event-1",
      permissions,
      roles,
    );
  });
});

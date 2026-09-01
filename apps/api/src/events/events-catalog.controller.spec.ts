import { Permission } from "#src/generated/prisma/client";
import { createAccessPolicy } from "@lootlog/access-policy";
import { REQUIRED_CAPABILITIES_KEY } from "@lootlog/nest-shared";
import { EventsCatalogController } from "./events-catalog.controller.js";

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
        REQUIRED_CAPABILITIES_KEY,
        EventsCatalogController.prototype.createEvent,
      ),
    ).toEqual([Permission.LOOTLOG_EVENTS_MANAGE]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        EventsCatalogController.prototype.getEvent,
      ),
    ).toEqual([Permission.LOOTLOG_EVENTS_READ]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
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
        createAccessPolicy({
          capabilities: [Permission.LOOTLOG_EVENTS_READ],
        }),
        "berufs",
        undefined,
        [{ id: "role-1" }] as never,
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
      expect.objectContaining({ allows: expect.any(Function) }),
    );
  });

  it("passes guild, event id, permissions and roles to wrapped view", () => {
    const guild = { id: "guild-1" };
    const accessPolicy = createAccessPolicy({
      capabilities: [Permission.LOOTLOG_EVENTS_READ],
    });
    const roles = [{ id: "role-1" }];

    controller.getWrapped(
      guild as never,
      "event-1",
      roles as never,
      accessPolicy,
    );

    expect(mockEventsService.getWrapped).toHaveBeenCalledWith(
      guild,
      "event-1",
      accessPolicy,
      roles,
    );
  });
});

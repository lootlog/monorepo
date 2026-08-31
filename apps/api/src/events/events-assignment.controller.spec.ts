import { ForbiddenException } from "@nestjs/common";
import { Permission } from "#src/db/domain";
import { PERMISSIONS_KEY } from "#src/shared/permissions/permissions.decorator";
import { EventsAssignmentController } from "./events-assignment.controller.js";

describe("EventsAssignmentController", () => {
  const mockEventsService = {
    assignMemberToMap: vi.fn(),
    getMapWithHeroAccessCheck: vi.fn(),
    unassignMemberFromMap: vi.fn(),
    createHero: vi.fn(),
    updateHero: vi.fn(),
    deleteHero: vi.fn(),
    addMap: vi.fn(),
    deleteMap: vi.fn(),
    getHeroWithAccessCheck: vi.fn(),
    getLocations: vi.fn(),
    createLocation: vi.fn(),
    updateLocation: vi.fn(),
    deleteLocation: vi.fn(),
    reorderLocations: vi.fn(),
    assignMapToLocation: vi.fn(),
  };

  let controller: EventsAssignmentController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new EventsAssignmentController(mockEventsService as never);
  });

  it("declares permissions metadata for manage/write/read endpoints", () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        EventsAssignmentController.prototype.assignMember,
      ),
    ).toEqual([Permission.LOOTLOG_EVENTS_MANAGE]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        EventsAssignmentController.prototype.selfAssignMember,
      ),
    ).toEqual([Permission.LOOTLOG_EVENTS_WRITE]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        EventsAssignmentController.prototype.getLocations,
      ),
    ).toEqual([Permission.LOOTLOG_EVENTS_READ]);
  });

  it("self-assigns only after hero access check passes", async () => {
    mockEventsService.getMapWithHeroAccessCheck.mockResolvedValue({
      id: "map-1",
    });

    await controller.selfAssignMember(
      { id: "guild-1" },
      "event-1",
      "map-1",
      { id: 12 },
      [] as never,
      [Permission.LOOTLOG_EVENTS_WRITE],
    );

    expect(mockEventsService.getMapWithHeroAccessCheck).toHaveBeenCalledWith(
      "guild-1",
      "event-1",
      "map-1",
      [],
      [Permission.LOOTLOG_EVENTS_WRITE],
    );
    expect(mockEventsService.assignMemberToMap).toHaveBeenCalledWith(
      "guild-1",
      "event-1",
      "map-1",
      12,
    );
  });

  it("propagates a forbidden self-assign when hero access check fails", async () => {
    mockEventsService.getMapWithHeroAccessCheck.mockRejectedValue(
      new ForbiddenException(),
    );

    await expect(
      controller.selfAssignMember(
        { id: "guild-1" },
        "event-1",
        "map-1",
        { id: 12 },
        [] as never,
        [Permission.LOOTLOG_EVENTS_WRITE],
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("checks hero visibility before returning locations", async () => {
    mockEventsService.getLocations.mockResolvedValue([{ id: "location-1" }]);

    await controller.getLocations(
      { id: "guild-1" },
      "event-1",
      "hero-1",
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
  });
});

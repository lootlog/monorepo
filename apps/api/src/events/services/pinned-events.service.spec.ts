import { ConflictException, NotFoundException } from "@nestjs/common";
import { mockFn } from "#src/test/mock-fn";
import { PinnedEventsService } from "./pinned-events.service.js";

describe("PinnedEventsService", () => {
  const referenceTime = new Date("2026-08-16T12:00:00.000Z");
  const pinAll = mockFn();
  const pinFirst = mockFn();
  const pinCreate = mockFn();
  const pinDelete = mockFn();
  const eventAll = mockFn();
  const eventFirst = mockFn();
  const heroAll = mockFn();
  const pinQuery = {
    orderBy: mockFn(() => ({ all: pinAll })),
    where: mockFn(() => ({ delete: pinDelete })),
    first: pinFirst,
    delete: pinDelete,
  };
  const prisma = {
    orm: {
      public: {
        UserPinnedEvent: {
          where: mockFn(() => pinQuery),
          create: pinCreate,
        },
        Event: {
          where: mockFn(() => ({
            where: mockFn(() => ({ all: eventAll })),
            select: mockFn(() => ({ first: eventFirst })),
          })),
        },
        EventHeroNpc: { where: mockFn(() => ({ all: heroAll })) },
      },
    },
  };
  let service: PinnedEventsService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(referenceTime);
    vi.clearAllMocks();
    heroAll.mockResolvedValue([]);
    pinDelete.mockResolvedValue(undefined);
    service = new PinnedEventsService(prisma as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes inactive pins and returns active pins in database order", async () => {
    pinAll.mockResolvedValue([
      createPin("event-2", "2026-08-16T11:00:00.000Z"),
      createPin("event-1", "2026-08-16T10:00:00.000Z"),
      createPin("inactive", "2026-08-16T09:00:00.000Z"),
    ]);
    eventAll.mockResolvedValue([
      createEvent({ id: "event-2", name: "Second" }),
      createEvent({ id: "event-1", name: "First" }),
      createEvent({
        id: "inactive",
        endsAt: new Date("2026-08-16T11:00:00.000Z"),
      }),
    ]);

    const result = await service.listPinnedEvents("user-1", "guild-1");

    expect(result.map(({ event }) => event.id)).toEqual(["event-2", "event-1"]);
    expect(result.every(({ event }) => event.active)).toBe(true);
    expect(pinDelete).toHaveBeenCalledOnce();
  });

  it("returns an existing pin without changing pinnedAt", async () => {
    eventAll.mockResolvedValue([createEvent()]);
    pinFirst.mockResolvedValue(createPin("event-1"));

    const result = await service.pinEvent("user-1", "guild-1", "event-1");

    expect(result.event).toMatchObject({ id: "event-1", active: true });
    expect(pinCreate).not.toHaveBeenCalled();
  });

  it("creates a pin when one does not exist", async () => {
    eventAll.mockResolvedValue([createEvent()]);
    pinFirst.mockResolvedValue(null);
    pinCreate.mockResolvedValue(createPin("event-1"));

    await service.pinEvent("user-1", "guild-1", "event-1");

    expect(pinCreate).toHaveBeenCalledWith({
      userId: "user-1",
      eventId: "event-1",
    });
  });

  it("rejects missing and inactive events", async () => {
    eventAll.mockResolvedValueOnce([]);
    await expect(
      service.pinEvent("user-1", "guild-1", "missing"),
    ).rejects.toBeInstanceOf(NotFoundException);

    eventAll.mockResolvedValueOnce([
      createEvent({ endsAt: new Date("2026-08-16T11:00:00.000Z") }),
    ]);
    await expect(
      service.pinEvent("user-1", "guild-1", "event-1"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(pinDelete).toHaveBeenCalledOnce();
  });

  it("unpins only when the event belongs to the resolved guild", async () => {
    eventFirst
      .mockResolvedValueOnce({ id: "event-1" })
      .mockResolvedValueOnce(null);

    await service.unpinEvent("user-1", "guild-1", "event-1");
    await service.unpinEvent("user-1", "guild-2", "event-1");

    expect(pinDelete).toHaveBeenCalledOnce();
  });
});

const createPin = (eventId: string, pinnedAt = "2026-08-16T10:00:00.000Z") => ({
  id: 1,
  userId: "user-1",
  eventId,
  pinnedAt: new Date(pinnedAt),
});

const createEvent = (overrides: Record<string, unknown> = {}) => ({
  id: "event-1",
  guildId: "guild-1",
  name: "Event",
  world: "tempest",
  startsAt: new Date("2026-08-16T10:00:00.000Z"),
  endsAt: null,
  createdAt: new Date("2026-08-16T09:00:00.000Z"),
  updatedAt: new Date("2026-08-16T09:00:00.000Z"),
  basePointsPerKill: 1,
  assignmentTimeoutMinutes: 5,
  mapAssignmentCap: null,
  scoringRules: null,
  rulebookMarkdown: null,
  participationConfirmationMinutes: 0,
  scoringMode: "SIMPLE",
  ...overrides,
});

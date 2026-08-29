import { ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "#src/db/prisma.service";
import { mockFn } from "#src/test/mock-fn";
import { PinnedEventsService } from "./pinned-events.service.js";

describe("PinnedEventsService", () => {
  const referenceTime = new Date("2026-08-16T12:00:00.000Z");
  const prisma = {
    event: {
      findFirst: mockFn(),
    },
    userPinnedEvent: {
      deleteMany: mockFn(),
      findMany: mockFn(),
      upsert: mockFn(),
    },
  };
  let service: PinnedEventsService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(referenceTime);
    vi.clearAllMocks();
    service = new PinnedEventsService(prisma as unknown as PrismaService);
    prisma.userPinnedEvent.deleteMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes inactive pins and returns active pins in database order", async () => {
    prisma.userPinnedEvent.findMany.mockResolvedValue([
      {
        pinnedAt: new Date("2026-08-16T11:00:00.000Z"),
        event: createEvent({ id: "event-2", name: "Second" }),
      },
      {
        pinnedAt: new Date("2026-08-16T10:00:00.000Z"),
        event: createEvent({ id: "event-1", name: "First" }),
      },
    ]);

    const result = await service.listPinnedEvents("user-1", "guild-1");

    expect(prisma.userPinnedEvent.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        event: {
          guildId: "guild-1",
          OR: [
            { startsAt: { gt: referenceTime } },
            { endsAt: { lte: referenceTime } },
          ],
        },
      },
    });
    expect(result.map(({ event }) => event.id)).toEqual(["event-2", "event-1"]);
    expect(result.every(({ event }) => event.active)).toBe(true);
  });

  it("pins an active event idempotently without changing pinnedAt", async () => {
    const event = createEvent();
    prisma.event.findFirst.mockResolvedValue(event);
    prisma.userPinnedEvent.upsert.mockResolvedValue({
      pinnedAt: new Date("2026-08-16T10:00:00.000Z"),
    });

    const result = await service.pinEvent("user-1", "guild-1", "event-1");

    expect(prisma.userPinnedEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_eventId: { userId: "user-1", eventId: "event-1" },
        },
        create: { userId: "user-1", eventId: "event-1" },
        update: {},
      }),
    );
    expect(result.event).toMatchObject({ id: "event-1", active: true });
  });

  it("rejects missing and inactive events", async () => {
    prisma.event.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.pinEvent("user-1", "guild-1", "missing"),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.event.findFirst.mockResolvedValueOnce(
      createEvent({ endsAt: new Date("2026-08-16T11:00:00.000Z") }),
    );

    await expect(
      service.pinEvent("user-1", "guild-1", "event-1"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.userPinnedEvent.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", eventId: "event-1" },
    });
    expect(prisma.userPinnedEvent.upsert).not.toHaveBeenCalled();
  });

  it("unpins only the current user's event from the resolved guild", async () => {
    await service.unpinEvent("user-1", "guild-1", "event-1");

    expect(prisma.userPinnedEvent.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        eventId: "event-1",
        event: { guildId: "guild-1" },
      },
    });
  });
});

const createEvent = (
  overrides: Partial<ReturnType<typeof createEventDefaults>> = {},
) => ({
  ...createEventDefaults(),
  ...overrides,
});

const createEventDefaults = () => ({
  id: "event-1",
  guildId: "guild-1",
  name: "Event",
  world: "tempest",
  startsAt: new Date("2026-08-16T10:00:00.000Z"),
  endsAt: null as Date | null,
  createdAt: new Date("2026-08-16T09:00:00.000Z"),
  updatedAt: new Date("2026-08-16T09:00:00.000Z"),
  heroNpcs: [],
});

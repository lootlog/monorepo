import { ConflictException, NotFoundException } from "@nestjs/common";
import { mockFn } from "#src/test/mock-fn";
import { PinnedEventsService } from "./pinned-events.service.js";
import { PinnedEventsRepository } from "./pinned-events.repository.js";

describe("PinnedEventsService", () => {
  const referenceTime = new Date("2026-08-16T12:00:00.000Z");
  const repository = {
    removeInactive: mockFn(),
    findActive: mockFn(),
    findEvent: mockFn(),
    remove: mockFn(),
    pin: mockFn(),
    removeFromGuild: mockFn(),
  };
  let service: PinnedEventsService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(referenceTime);
    vi.clearAllMocks();
    service = new PinnedEventsService(
      repository as unknown as PinnedEventsRepository,
    );
    repository.removeInactive.mockResolvedValue(undefined);
    repository.remove.mockResolvedValue(undefined);
    repository.removeFromGuild.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes inactive pins and returns active pins in database order", async () => {
    repository.findActive.mockResolvedValue([
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

    expect(repository.removeInactive).toHaveBeenCalledWith(
      "user-1",
      "guild-1",
      referenceTime,
    );
    expect(result.map(({ event }) => event.id)).toEqual(["event-2", "event-1"]);
    expect(result.every(({ event }) => event.active)).toBe(true);
  });

  it("pins an active event idempotently without changing pinnedAt", async () => {
    const event = createEvent();
    repository.findEvent.mockResolvedValue(event);
    repository.pin.mockResolvedValue({
      pinnedAt: new Date("2026-08-16T10:00:00.000Z"),
    });

    const result = await service.pinEvent("user-1", "guild-1", "event-1");

    expect(repository.pin).toHaveBeenCalledWith("user-1", "event-1");
    expect(result.event).toMatchObject({ id: "event-1", active: true });
  });

  it("rejects missing and inactive events", async () => {
    repository.findEvent.mockResolvedValueOnce(null);

    await expect(
      service.pinEvent("user-1", "guild-1", "missing"),
    ).rejects.toBeInstanceOf(NotFoundException);

    repository.findEvent.mockResolvedValueOnce(
      createEvent({ endsAt: new Date("2026-08-16T11:00:00.000Z") }),
    );

    await expect(
      service.pinEvent("user-1", "guild-1", "event-1"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.remove).toHaveBeenCalledWith("user-1", "event-1");
    expect(repository.pin).not.toHaveBeenCalled();
  });

  it("unpins only the current user's event from the resolved guild", async () => {
    await service.unpinEvent("user-1", "guild-1", "event-1");

    expect(repository.removeFromGuild).toHaveBeenCalledWith(
      "user-1",
      "guild-1",
      "event-1",
    );
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

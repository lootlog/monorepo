import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { makeEventsPins } from "#src/events/pins/events-pins.operations";
import type { PinnedEventsPersistence } from "#src/events/pins/pinned-events.repository";

const event = (endsAt: Date | null = null) => ({
  id: "event-1",
  guildId: "guild-1",
  name: "Event",
  world: "tempest",
  startsAt: new Date("2026-08-16T10:00:00.000Z"),
  endsAt,
  createdAt: new Date("2026-08-16T09:00:00.000Z"),
  updatedAt: new Date("2026-08-16T09:00:00.000Z"),
  basePointsPerKill: 1,
  assignmentTimeoutMinutes: 5,
  participationConfirmationMinutes: 0,
  mapAssignmentCap: null,
  scoringMode: "SIMPLE" as const,
  scoringRules: null,
  rulebookMarkdown: null,
  heroNpcs: [],
});

const persistenceWith = (
  overrides: Partial<PinnedEventsPersistence> = {},
): PinnedEventsPersistence =>
  ({
    removeInactive: () => Effect.void,
    findActive: () => Effect.succeed([]),
    findEvent: () => Effect.succeed(event()),
    remove: () => Effect.void,
    pin: () =>
      Effect.succeed({ pinnedAt: new Date("2026-08-16T11:00:00.000Z") }),
    removeFromGuild: () => Effect.void,
    ...overrides,
  }) as PinnedEventsPersistence;

describe("event pins Effect module", () => {
  it("removes inactive pins before returning the active projection", async () => {
    const removeInactive = mock(() => Effect.void);
    const operations = makeEventsPins(
      persistenceWith({
        removeInactive,
        findActive: () =>
          Effect.succeed([
            {
              pinnedAt: new Date("2026-08-16T11:00:00.000Z"),
              event: event(),
            },
          ]),
      }),
    );

    const result = await Effect.runPromise(
      operations.listPinnedEvents("user-1", { id: "guild-1" }),
    );

    expect(removeInactive).toHaveBeenCalledTimes(1);
    expect(result[0]?.event).toMatchObject({ id: "event-1", active: true });
  });

  it("fails closed for a missing event", async () => {
    const pin = mock(() => Effect.succeed(null));
    const operations = makeEventsPins(
      persistenceWith({ findEvent: () => Effect.succeed(null), pin }),
    );

    await expect(
      Effect.runPromise(
        operations.pinEvent("user-1", { id: "guild-1" }, "missing"),
      ),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(pin).not.toHaveBeenCalled();
  });

  it("removes an inactive pin and returns the established conflict", async () => {
    const remove = mock(() => Effect.void);
    const operations = makeEventsPins(
      persistenceWith({
        findEvent: () =>
          Effect.succeed(event(new Date("2020-01-01T00:00:00.000Z"))),
        remove,
      }),
    );

    await expect(
      Effect.runPromise(
        operations.pinEvent("user-1", { id: "guild-1" }, "event-1"),
      ),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(remove).toHaveBeenCalledWith("user-1", "event-1");
  });
});

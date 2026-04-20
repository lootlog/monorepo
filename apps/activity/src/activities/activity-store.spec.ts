import { ActivityType } from "../generated/prisma/client.js";
import { NotFoundError } from "../lib/errors/http-errors.js";
import { ActivityStore } from "./activity-store.js";

describe("ActivityStore", () => {
  const prismaDatabase = {
    activity: {
      findFirst: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    activityActorSnapshot: {
      upsert: vi.fn(),
    },
  };

  const logger = {
    info: vi.fn(),
    error: vi.fn(),
  };

  const activityStore = new ActivityStore(
    prismaDatabase as never,
    logger as never,
  );

  it("throws when deleting a missing activity", async () => {
    prismaDatabase.activity.findFirst.mockResolvedValue(null);

    await expect(
      activityStore.deleteOne("activity-1", "guild-1"),
    ).rejects.toThrow(NotFoundError);
  });

  it("deletes an existing activity by composite id", async () => {
    prismaDatabase.activity.findFirst.mockResolvedValue({
      id: "activity-1",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
    });
    prismaDatabase.activity.delete.mockResolvedValue({
      id: "activity-1",
      type: ActivityType.CONNECT_EVENT,
    });

    await expect(
      activityStore.deleteOne("activity-1", "guild-1"),
    ).resolves.toBe(1);

    expect(prismaDatabase.activity.delete).toHaveBeenCalledWith({
      where: {
        id_createdAt: {
          id: "activity-1",
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
        },
      },
    });
  });
});

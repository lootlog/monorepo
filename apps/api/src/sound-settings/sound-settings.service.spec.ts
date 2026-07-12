import { Prisma } from "src/generated/prisma/client";
import { SoundSettingsService } from "./sound-settings.service";

type StoredSettings = ReturnType<typeof createStoredSettings>;
type UpsertArguments = {
  where: { userId: string };
  update: Record<string, unknown>;
  create: Record<string, unknown>;
};
type TransactionClientMock = {
  userSoundSettings: {
    findUnique: ReturnType<
      typeof vi.fn<(_args: unknown) => Promise<StoredSettings | null>>
    >;
    upsert: ReturnType<
      typeof vi.fn<(_args: UpsertArguments) => Promise<StoredSettings>>
    >;
  };
};

const createStoredSettings = (
  overrides: Partial<{
    notificationsConfig: Record<string, unknown>;
    detectorConfig: Record<string, unknown>;
    timersConfig: Record<string, unknown>;
    pingsVolume: number;
  }> = {},
) => ({
  id: 1,
  userId: "user-1",
  masterVolume: 0.5,
  notificationsVolume: 0.5,
  detectorVolume: 0.5,
  timersVolume: 0.5,
  pingsVolume: 0,
  notificationsConfig: {
    ELITE2: { volume: 0.5, soundUrl: "" },
    HERO: { volume: 0.5, soundUrl: "" },
    COLOSSUS: { volume: 0.5, soundUrl: "" },
    TITAN: { volume: 0.5, soundUrl: "" },
    message: { volume: 0.5, soundUrl: "" },
  },
  detectorConfig: {
    ELITE2: { volume: 0.5, soundUrl: "" },
    HERO: { volume: 0.5, soundUrl: "" },
    COLOSSUS: { volume: 0.5, soundUrl: "" },
    TITAN: { volume: 0.5, soundUrl: "" },
  },
  timersConfig: {
    ELITE2: { volume: 0.5, soundUrl: "" },
    HERO: { volume: 0.5, soundUrl: "" },
    COLOSSUS: { volume: 0.5, soundUrl: "" },
    TITAN: { volume: 0.5, soundUrl: "" },
  },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

const createPrismaMock = (
  storedSettings: StoredSettings | null,
  transactionFailures: unknown[] = [],
) => {
  const findUnique = vi
    .fn<(_args: unknown) => Promise<StoredSettings | null>>()
    .mockResolvedValue(storedSettings);
  const upsertResult = storedSettings ?? createStoredSettings();
  const upsert = vi
    .fn<(_args: UpsertArguments) => Promise<StoredSettings>>()
    .mockResolvedValue(upsertResult);
  const transactionClient: TransactionClientMock = {
    userSoundSettings: { findUnique, upsert },
  };
  const failures = [...transactionFailures];
  const transaction = vi.fn<
    (
      operation: (client: TransactionClientMock) => Promise<StoredSettings>,
      _options?: unknown,
    ) => Promise<StoredSettings>
  >((operation, _options) => {
    const failure = failures.shift();
    if (failure) {
      return Promise.reject(failure);
    }

    return operation(transactionClient);
  });

  return {
    prisma: {
      userSoundSettings: { findUnique },
      $transaction: transaction,
    },
    findUnique,
    upsert,
    transaction,
  };
};

describe("SoundSettingsService", () => {
  it("returns map ping sounds muted by default", async () => {
    const { prisma } = createPrismaMock(null);
    const service = new SoundSettingsService(prisma as never);

    const settings = await service.getSettings("user-1");

    expect(settings).toEqual(
      expect.objectContaining({
        userId: "user-1",
        pingsVolume: 0,
      }),
    );
  });

  it("fills missing entries in an existing sound configuration", async () => {
    const storedSettings = createStoredSettings({
      notificationsConfig: {
        message: {
          volume: 0.4,
          soundUrl: "https://example.com/message.mp3",
        },
      },
    });
    const { prisma } = createPrismaMock(storedSettings);
    const service = new SoundSettingsService(prisma as never);

    const settings = await service.getSettings("user-1");

    expect(settings.notificationsConfig).toEqual(
      expect.objectContaining({
        message: storedSettings.notificationsConfig.message,
        ELITE2: { volume: 0.5, soundUrl: "" },
      }),
    );
  });

  it("persists the global map ping volume", async () => {
    const storedSettings = createStoredSettings({ pingsVolume: 0.75 });
    const { prisma, upsert } = createPrismaMock(storedSettings);
    const service = new SoundSettingsService(prisma as never);

    await expect(
      service.updateSettings("user-1", { pingsVolume: 0.75 }),
    ).resolves.toEqual(expect.objectContaining({ pingsVolume: 0.75 }));
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        update: expect.objectContaining({ pingsVolume: 0.75 }),
        create: expect.objectContaining({
          userId: "user-1",
          pingsVolume: 0.75,
        }),
      }),
    );
  });

  it("preserves existing notification sounds when another sound is updated", async () => {
    const storedSettings = createStoredSettings({
      notificationsConfig: {
        message: {
          volume: 0.4,
          soundUrl: "https://example.com/message.mp3",
        },
        ELITE2: { volume: 0.7, soundUrl: "" },
      },
    });
    const { prisma, upsert } = createPrismaMock(storedSettings);
    const service = new SoundSettingsService(prisma as never);

    await service.updateSettings("user-1", {
      notificationsConfig: {
        ELITE2: { soundUrl: "https://example.com/elite2.mp3" },
      },
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          notificationsConfig: expect.objectContaining({
            message: storedSettings.notificationsConfig.message,
            ELITE2: {
              volume: 0.7,
              soundUrl: "https://example.com/elite2.mp3",
            },
          }),
        }),
      }),
    );
  });

  it("treats an empty sound URL as an explicit reset", async () => {
    const storedSettings = createStoredSettings({
      notificationsConfig: {
        message: {
          volume: 0.4,
          soundUrl: "https://example.com/message.mp3",
        },
      },
    });
    const { prisma, upsert } = createPrismaMock(storedSettings);
    const service = new SoundSettingsService(prisma as never);

    await service.updateSettings("user-1", {
      notificationsConfig: { message: { soundUrl: "" } },
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          notificationsConfig: expect.objectContaining({
            message: { volume: 0.4, soundUrl: "" },
          }),
        }),
      }),
    );
  });

  it.each(["notificationsConfig", "detectorConfig", "timersConfig"] as const)(
    "merges partial entries in %s",
    async (configKey) => {
      const storedSettings = createStoredSettings({
        [configKey]: {
          HERO: { volume: 0.35, soundUrl: "https://example.com/hero.mp3" },
        },
      });
      const { prisma, upsert } = createPrismaMock(storedSettings);
      const service = new SoundSettingsService(prisma as never);

      await service.updateSettings("user-1", {
        [configKey]: { HERO: { soundUrl: "https://example.com/new-hero.mp3" } },
      });

      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            [configKey]: expect.objectContaining({
              HERO: {
                volume: 0.35,
                soundUrl: "https://example.com/new-hero.mp3",
              },
            }),
          }),
        }),
      );
    },
  );

  it("merges the first partial update with all default entries", async () => {
    const { prisma, upsert } = createPrismaMock(null);
    const service = new SoundSettingsService(prisma as never);

    await service.updateSettings("user-1", {
      notificationsConfig: {
        message: { soundUrl: "https://example.com/message.mp3" },
      },
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          notificationsConfig: expect.objectContaining({
            ELITE2: { volume: 0.5, soundUrl: "" },
            message: {
              volume: 0.5,
              soundUrl: "https://example.com/message.mp3",
            },
          }),
        }),
      }),
    );
  });

  it("retries a serializable transaction conflict", async () => {
    const serializationError = Object.assign(
      Object.create(Prisma.PrismaClientKnownRequestError.prototype) as object,
      { code: "P2034" },
    );
    const storedSettings = createStoredSettings();
    const { prisma, transaction } = createPrismaMock(storedSettings, [
      serializationError,
    ]);
    const service = new SoundSettingsService(prisma as never);

    await service.updateSettings("user-1", { notificationsVolume: 0.75 });

    expect(transaction).toHaveBeenCalledTimes(2);
    expect(transaction).toHaveBeenLastCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });
});

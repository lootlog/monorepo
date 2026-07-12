import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import { Prisma } from "src/generated/prisma/client";
import type { NpcTypeSoundConfig } from "@lootlog/types";
import type { UpdateSoundSettingsDto } from "./dto/update-sound-settings.dto";

type SoundConfigMap = Record<string, NpcTypeSoundConfig>;
type SoundConfigPatch = Record<string, Partial<NpcTypeSoundConfig> | undefined>;

const SERIALIZABLE_TRANSACTION_ATTEMPTS = 3;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

@Injectable()
export class SoundSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string) {
    const settings = await this.prisma.userSoundSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return this.createDefaultSettings(userId);
    }

    return this.normalizeSettings(settings);
  }

  async updateSettings(userId: string, dto: UpdateSoundSettingsDto) {
    const settings = await this.runSerializableTransaction(
      async (transaction) => {
        const currentSettings = await transaction.userSoundSettings.findUnique({
          where: { userId },
        });
        const defaults = this.getDefaultSettingsData();
        const {
          notificationsConfig,
          detectorConfig,
          timersConfig,
          ...scalarPatch
        } = dto;
        const mergedNotificationsConfig = this.mergeSoundConfigMap(
          currentSettings?.notificationsConfig,
          defaults.notificationsConfig,
          notificationsConfig,
        );
        const mergedDetectorConfig = this.mergeSoundConfigMap(
          currentSettings?.detectorConfig,
          defaults.detectorConfig,
          detectorConfig,
        );
        const mergedTimersConfig = this.mergeSoundConfigMap(
          currentSettings?.timersConfig,
          defaults.timersConfig,
          timersConfig,
        );
        const notificationsJson = this.toInputJson(mergedNotificationsConfig);
        const detectorJson = this.toInputJson(mergedDetectorConfig);
        const timersJson = this.toInputJson(mergedTimersConfig);

        return transaction.userSoundSettings.upsert({
          where: { userId },
          update: {
            ...scalarPatch,
            ...(notificationsConfig
              ? { notificationsConfig: notificationsJson }
              : {}),
            ...(detectorConfig ? { detectorConfig: detectorJson } : {}),
            ...(timersConfig ? { timersConfig: timersJson } : {}),
            updatedAt: new Date(),
          },
          create: {
            userId,
            ...defaults,
            ...scalarPatch,
            notificationsConfig: notificationsJson,
            detectorConfig: detectorJson,
            timersConfig: timersJson,
          },
        });
      },
    );

    return this.normalizeSettings(settings);
  }

  private async runSerializableTransaction<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
    attempt = 1,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const shouldRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < SERIALIZABLE_TRANSACTION_ATTEMPTS;
      if (!shouldRetry) {
        throw error;
      }

      return this.runSerializableTransaction(operation, attempt + 1);
    }
  }

  private normalizeSettings<
    T extends {
      notificationsConfig: unknown;
      detectorConfig: unknown;
      timersConfig: unknown;
    },
  >(settings: T) {
    const defaults = this.getDefaultSettingsData();

    return {
      ...settings,
      notificationsConfig: this.mergeSoundConfigMap(
        settings.notificationsConfig,
        defaults.notificationsConfig,
      ),
      detectorConfig: this.mergeSoundConfigMap(
        settings.detectorConfig,
        defaults.detectorConfig,
      ),
      timersConfig: this.mergeSoundConfigMap(
        settings.timersConfig,
        defaults.timersConfig,
      ),
    };
  }

  private mergeSoundConfigMap(
    storedValue: unknown,
    defaults: SoundConfigMap,
    patch?: SoundConfigPatch,
  ): SoundConfigMap {
    const merged: SoundConfigMap = structuredClone(defaults);

    if (isRecord(storedValue)) {
      for (const [key, storedConfig] of Object.entries(storedValue)) {
        if (!isRecord(storedConfig)) {
          continue;
        }

        const fallback = merged[key] ?? { volume: 0.5, soundUrl: "" };
        merged[key] = {
          volume:
            typeof storedConfig.volume === "number"
              ? storedConfig.volume
              : fallback.volume,
          soundUrl:
            typeof storedConfig.soundUrl === "string"
              ? storedConfig.soundUrl
              : fallback.soundUrl,
        };
      }
    }

    if (patch) {
      for (const [key, partialConfig] of Object.entries(patch)) {
        if (!partialConfig) {
          continue;
        }

        merged[key] = {
          ...(merged[key] ?? { volume: 0.5, soundUrl: "" }),
          ...partialConfig,
        };
      }
    }

    return merged;
  }

  private toInputJson(config: SoundConfigMap): Prisma.InputJsonValue {
    return config as unknown as Prisma.InputJsonValue;
  }

  private createDefaultSettings(userId: string) {
    return {
      id: 0,
      userId,
      ...this.getDefaultSettingsData(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getDefaultSettingsData() {
    const defaultNpcConfig = {
      ELITE2: { volume: 0.5, soundUrl: "" },
      HERO: { volume: 0.5, soundUrl: "" },
      COLOSSUS: { volume: 0.5, soundUrl: "" },
      TITAN: { volume: 0.5, soundUrl: "" },
    };

    const defaultNotificationsConfig = {
      ...defaultNpcConfig,
      message: { volume: 0.5, soundUrl: "" },
    };

    return {
      masterVolume: 0.5,
      notificationsVolume: 0.5,
      detectorVolume: 0.5,
      timersVolume: 0.5,
      pingsVolume: 0,
      notificationsConfig: defaultNotificationsConfig,
      detectorConfig: defaultNpcConfig,
      timersConfig: defaultNpcConfig,
    };
  }
}

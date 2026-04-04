import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import type { UpdateTimerSettingsDto } from "./dto/update-timer-settings.dto";
import type { UpdateGuildTimerSettingsDto } from "./dto/update-guild-timer-settings.dto";
import type { MigrateTimerSettingsDto } from "./dto/migrate-timer-settings.dto";

@Injectable()
export class TimerSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalSettings(userId: string) {
    const settings = await this.prisma.userTimerSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return this.createDefaultGlobalSettings(userId);
    }

    return settings;
  }

  async updateGlobalSettings(userId: string, dto: UpdateTimerSettingsDto) {
    const settings = await this.prisma.userTimerSettings.upsert({
      where: { userId },
      update: {
        ...(dto as Record<string, unknown>),
        updatedAt: new Date(),
      },
      create: {
        userId,
        ...this.getDefaultGlobalSettingsData(),
        ...(dto as Record<string, unknown>),
      },
    });

    return settings;
  }

  async getGuildSettings(userId: string, guildId: string) {
    const settings = await this.prisma.userGuildTimerSettings.findUnique({
      where: {
        userId_guildId: {
          userId,
          guildId,
        },
      },
    });

    if (!settings) {
      return this.createDefaultGuildSettings(userId, guildId);
    }

    return settings;
  }

  async updateGuildSettings(
    userId: string,
    guildId: string,
    dto: UpdateGuildTimerSettingsDto,
  ) {
    const settings = await this.prisma.userGuildTimerSettings.upsert({
      where: {
        userId_guildId: {
          userId,
          guildId,
        },
      },
      update: {
        ...(dto as Record<string, unknown>),
        updatedAt: new Date(),
      },
      create: {
        userId,
        guildId,
        ...this.getDefaultGuildSettingsData(),
        ...(dto as Record<string, unknown>),
      },
    });

    return settings;
  }

  async migrateSettings(userId: string, dto: MigrateTimerSettingsDto) {
    const { localData, conflictResolution = "local" } = dto;

    const existingGlobalSettings =
      await this.prisma.userTimerSettings.findUnique({
        where: { userId },
      });

    if (existingGlobalSettings && conflictResolution === "remote") {
      return {
        global: existingGlobalSettings,
        message: "Using remote (backend) settings",
      };
    }

    const globalSettings = this.extractGlobalSettingsFromLocal(localData);
    const guildSettings = this.extractGuildSettingsFromLocal(localData);

    const updatedGlobal = await this.prisma.userTimerSettings.upsert({
      where: { userId },
      update: {
        ...(globalSettings as Record<string, unknown>),
        updatedAt: new Date(),
      },
      create: {
        userId,
        ...(globalSettings as Record<string, unknown>),
      } as Parameters<typeof this.prisma.userTimerSettings.upsert>[0]["create"],
    });

    const updatedGuilds = await Promise.all(
      Object.entries(guildSettings).map(([guildId, settings]) => {
        return this.prisma.userGuildTimerSettings.upsert({
          where: {
            userId_guildId: {
              userId,
              guildId,
            },
          },
          update: {
            ...(settings as Record<string, unknown>),
            updatedAt: new Date(),
          },
          create: {
            userId,
            guildId,
            ...(settings as Record<string, unknown>),
          } as Parameters<
            typeof this.prisma.userGuildTimerSettings.upsert
          >[0]["create"],
        });
      }),
    );

    return {
      global: updatedGlobal,
      guilds: updatedGuilds,
      message: "Migration completed successfully",
    };
  }

  private createDefaultGlobalSettings(userId: string) {
    return {
      id: 0,
      userId,
      ...this.getDefaultGlobalSettingsData(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private createDefaultGuildSettings(userId: string, guildId: string) {
    return {
      id: 0,
      userId,
      guildId,
      ...this.getDefaultGuildSettingsData(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getDefaultGlobalSettingsData() {
    return {
      generalConfig: {
        removeTimerAfterMs: 30000,
        timersGrouping: false,
        timersUnderBag: false,
        countdownMode: "max",
      },
      displayConfig: {
        showType: true,
        showLevel: false,
        fontSize: 11,
        minColumnWidth: 120,
        singleTimerDisplayMode: "row",
      },
      customColors: {},
      timersColors: {},
      defaultColorNames: {},
      overriddenDefaultColors: {},
      hiddenDefaultColors: [],
      timerFiltersEnabled: true,
      colorFiltersEnabled: false,
      timersSortOrder: "asc",
      syncEnabled: true,
    };
  }

  private getDefaultGuildSettingsData() {
    return {
      hiddenTimers: [],
      pinnedTimers: [],
    };
  }

  private extractGlobalSettingsFromLocal(localData: Record<string, unknown>) {
    return {
      generalConfig: (localData.generalConfig as Record<string, unknown>) ?? {},
      displayConfig: (localData.displayConfig as Record<string, unknown>) ?? {},
      customColors: (localData.customColors as Record<string, unknown>) ?? {},
      timersColors: (localData.timersColors as Record<string, unknown>) ?? {},
      defaultColorNames:
        (localData.defaultColorNames as Record<string, unknown>) ?? {},
      overriddenDefaultColors:
        (localData.overriddenDefaultColors as Record<string, unknown>) ?? {},
      hiddenDefaultColors: (localData.hiddenDefaultColors as string[]) ?? [],
      timerFiltersEnabled: (localData.timerFiltersEnabled as boolean) ?? true,
      colorFiltersEnabled: (localData.colorFiltersEnabled as boolean) ?? false,
      timersSortOrder: (localData.timersSortOrder as string) ?? "desc",
      syncEnabled: (localData.syncEnabled as boolean) ?? true,
    };
  }

  private extractGuildSettingsFromLocal(localData: Record<string, unknown>) {
    const hiddenTimers =
      (localData.hiddenTimers as Record<string, string[]>) ?? {};
    const pinnedTimers =
      (localData.pinnedTimers as Record<string, string[]>) ?? {};

    const guildIds = new Set([
      ...Object.keys(hiddenTimers),
      ...Object.keys(pinnedTimers),
    ]);

    const guildSettings: Record<
      string,
      {
        hiddenTimers: string[];
        pinnedTimers: string[];
      }
    > = {};

    for (const guildId of guildIds) {
      guildSettings[guildId] = {
        hiddenTimers: hiddenTimers[guildId] ?? [],
        pinnedTimers: pinnedTimers[guildId] ?? [],
      };
    }

    return guildSettings;
  }
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import type { UpdateSoundSettingsDto } from "./dto/update-sound-settings.dto";

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

    return settings;
  }

  async updateSettings(userId: string, dto: UpdateSoundSettingsDto) {
    const settings = await this.prisma.userSoundSettings.upsert({
      where: { userId },
      update: {
        ...(dto as Record<string, unknown>),
        updatedAt: new Date(),
      },
      create: {
        userId,
        ...this.getDefaultSettingsData(),
        ...(dto as Record<string, unknown>),
      },
    });

    return settings;
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
      notificationsConfig: defaultNotificationsConfig,
      detectorConfig: defaultNpcConfig,
      timersConfig: defaultNpcConfig,
    };
  }
}

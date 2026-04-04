import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import type { UpdateEventSettingsDto } from "../dto/update-event-settings.dto";

@Injectable()
export class EventSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string, guildId: string) {
    const settings = await this.prisma.userGuildEventSettings.findUnique({
      where: {
        userId_guildId: {
          userId,
          guildId,
        },
      },
    });

    if (!settings) {
      return {
        id: 0,
        userId,
        guildId,
        pinnedEvents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return settings;
  }

  updateSettings(userId: string, guildId: string, dto: UpdateEventSettingsDto) {
    return this.prisma.userGuildEventSettings.upsert({
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
        pinnedEvents: [],
        ...(dto as Record<string, unknown>),
      },
    });
  }
}

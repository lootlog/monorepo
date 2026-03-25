import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import type { UpdateUserPreferencesDto } from "src/users/dto/update-user-preferences.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPreferences(userId: string) {
    const userSettings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    const settings = userSettings || {
      id: 0,
      userId,
      guildsOrder: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return settings;
  }

  async updateUserPreferences(
    userId: string,
    preferences: UpdateUserPreferencesDto,
  ) {
    const userSettings = await this.prisma.userSettings.upsert({
      where: { userId },
      update: { ...preferences, updatedAt: new Date() },
      create: { userId, ...preferences },
    });

    return userSettings;
  }
}

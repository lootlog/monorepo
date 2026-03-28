import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger as WinstonLogger } from "winston";
import { firstValueFrom } from "rxjs";
import { PrismaService } from "src/db/prisma.service";
import { AuthService } from "src/auth/auth.service";
import { ConfigKey } from "src/config/config-key.enum";
import type { BattlelogConfig } from "src/config/battlelog.config";
import type { UpdateUserPreferencesDto } from "src/users/dto/update-user-preferences.dto";

@Injectable()
export class UsersService {
  private readonly battlelogServiceUrl: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: WinstonLogger,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const battlelogConfig = this.configService.get<BattlelogConfig>(
      ConfigKey.BATTLELOG,
    );
    this.battlelogServiceUrl = battlelogConfig.serviceUrl;
  }

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

  async deleteAccount(userId: string) {
    await this.triggerBattlelogCleanup(userId);

    const members = await this.prisma.member.findMany({
      where: { userId },
      select: { id: true },
    });

    const memberIds = members.map((m) => m.id);

    await this.prisma.$transaction([
      this.prisma.npcKillStats.deleteMany({
        where: { memberId: { in: memberIds } },
      }),
      this.prisma.userKillStats.deleteMany({ where: { userId } }),
      this.prisma.userSettings.deleteMany({ where: { userId } }),
      this.prisma.userTimerSettings.deleteMany({ where: { userId } }),
      this.prisma.userSoundSettings.deleteMany({ where: { userId } }),
      this.prisma.userCharactersLootlogSettings.deleteMany({
        where: { userId },
      }),
      this.prisma.userGuildTimerSettings.deleteMany({ where: { userId } }),
      this.prisma.userGuildEventSettings.deleteMany({ where: { userId } }),
      this.prisma.member.updateMany({
        where: { userId },
        data: { active: false },
      }),
    ]);

    await this.authService.invalidateIdpTokenCache(userId);
  }

  private async triggerBattlelogCleanup(userId: string): Promise<void> {
    const battlelogUrl = `${this.battlelogServiceUrl}/internal/delete-user-data`;
    const cleanupResponse = await firstValueFrom(
      this.httpService.post<{ status?: string }>(
        battlelogUrl,
        { userId },
        { timeout: 5000 },
      ),
    ).catch((error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to trigger battlelog cleanup for user ${userId}: ${errorMessage}`,
      );
      throw new ServiceUnavailableException({
        message: "BATTLELOG_SERVICE_UNAVAILABLE",
        retryAfter: 60,
      });
    });

    if (cleanupResponse.data?.status !== "ACCEPTED") {
      this.logger.warn(
        `Unexpected battlelog cleanup response for user ${userId}: ${JSON.stringify(cleanupResponse.data)}`,
      );
      throw new ServiceUnavailableException({
        message: "BATTLELOG_SERVICE_UNAVAILABLE",
        retryAfter: 60,
      });
    }
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

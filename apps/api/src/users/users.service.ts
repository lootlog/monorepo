import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger as WinstonLogger } from "winston";
import { firstValueFrom } from "rxjs";
import { PrismaService } from "src/db/prisma.service";
import { AuthService } from "src/auth/auth.service";
import { battlelogConfig } from "src/config/battlelog.config";
import { MembersService } from "src/members/members.service";
import { RedisService } from "@lootlog/nest-shared";
import { getUserLootlogConfigCachePattern } from "src/shared/constants/cache.constant";
import type { UpdateUserPreferencesDto } from "src/users/dto/update-user-preferences.dto";

type DeleteAccountParams = {
  authUserId: string;
  discordId: string;
};

@Injectable()
export class UsersService {
  private readonly battlelogServiceUrl: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: WinstonLogger,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly membersService: MembersService,
    private readonly redisService: RedisService,
    private readonly httpService: HttpService,
  ) {
    this.battlelogServiceUrl = battlelogConfig.serviceUrl;
  }

  async getUserPreferences(userId: string) {
    const userSettings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    const settings = userSettings ?? {
      id: 0,
      userId,
      guildsOrder: [],
      theme: "default",
      colorMode: "dark",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return settings;
  }

  async deleteAccount({ authUserId, discordId }: DeleteAccountParams) {
    await this.triggerBattlelogCleanup(authUserId);

    const deletedMembers = await this.prisma.$transaction(async (tx) => {
      const members = await tx.member.findMany({
        where: { userId: discordId },
        select: {
          id: true,
          guildId: true,
          globalUserId: true,
          userId: true,
        },
      });

      const memberIds = members.map((member) => member.id);

      if (memberIds.length > 0) {
        await tx.npcKillStats.deleteMany({
          where: { memberId: { in: memberIds } },
        });
      }

      await tx.userKillStats.deleteMany({ where: { userId: discordId } });
      await tx.userCharactersLootlogSettings.deleteMany({
        where: { userId: discordId },
      });
      await tx.userSettings.deleteMany({ where: { userId: authUserId } });
      await tx.userTimerSettings.deleteMany({ where: { userId: authUserId } });
      await tx.userSoundSettings.deleteMany({ where: { userId: authUserId } });
      await tx.userGuildTimerSettings.deleteMany({
        where: { userId: authUserId },
      });
      await tx.userGuildEventSettings.deleteMany({
        where: { userId: authUserId },
      });

      await Promise.all(
        members.map((member) =>
          tx.member.update({
            where: { id: member.id },
            data: {
              active: false,
              lastDiscordAttemptAt: new Date(),
              lastDiscordStatus: "ACCOUNT_DELETED",
              roles: { set: [] },
            },
          }),
        ),
      );

      return members.map((member) => ({
        discordId: member.userId,
        guildId: member.guildId,
        globalUserId: member.globalUserId,
      }));
    });

    await Promise.all([
      this.authService.invalidateIdpTokenCache(authUserId),
      this.membersService.notifyMembersRemoved(deletedMembers),
      this.redisService.deleteByPattern(
        getUserLootlogConfigCachePattern(discordId),
      ),
    ]);
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

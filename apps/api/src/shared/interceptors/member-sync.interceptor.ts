import {
  Inject,
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from "@nestjs/common";
import { APPLICATION_LOGGER } from "#src/shared/logging/logger-token";
import type { Logger } from "winston";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { RedisService } from "@lootlog/nest-shared/redis";
import { MembersService } from "#src/members/members.service";
import { MEMBER_REFRESH_PRIORITY } from "#src/members/constants/member-refresh-queue.constant";
import { MemberSyncRepository } from "./member-sync.repository.js";

@Injectable()
export class MemberSyncInterceptor implements NestInterceptor {
  private readonly SYNC_THROTTLE_TTL = 600;

  constructor(
    @Inject(APPLICATION_LOGGER) private readonly logger: Logger,
    private readonly repository: MemberSyncRepository,
    private readonly membersService: MembersService,
    private readonly redis: RedisService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { userId, discordId } = request;

    return next.handle().pipe(
      tap((data) => {
        if (!userId || !discordId || !data) {
          return;
        }

        try {
          const guilds = Array.isArray(data) ? data : [];

          if (guilds.length === 0) {
            return;
          }

          // Fire and forget - don't block response
          this.queueStaleMemberRefreshes(discordId, userId, guilds).catch(
            (error) => {
              this.logger.log({
                level: "error",
                message: "Error queuing stale member refreshes",
                stack: (error as Error).stack,
              });
            },
          );
        } catch (error) {
          this.logger.log({
            level: "error",
            message: "Error in member sync interceptor",
            stack: (error as Error).stack,
          });
        }
      }),
    );
  }

  private async queueStaleMemberRefreshes(
    discordId: string,
    userId: string,
    guilds: Array<{ id: string }>,
  ) {
    const throttleKey = `member:sync:throttle:${discordId}`;
    const isThrottled = await this.redis.get(throttleKey);

    if (isThrottled) {
      this.logger.log({
        level: "debug",
        message: `Sync throttled for user ${discordId}, skipping refresh`,
      });
      return;
    }

    const guildIds = guilds.map((g) => g.id);
    const staleThreshold = this.membersService.getMemberSoftStaleThreshold();

    const staleMembers = await this.repository.findStaleMembers(
      discordId,
      guildIds,
      staleThreshold,
    );

    if (staleMembers.length === 0) {
      this.logger.log({
        level: "debug",
        message: `No stale members found for user ${userId} in ${guildIds.length} guilds`,
      });
      return;
    }

    await this.redis.set(throttleKey, "1", this.SYNC_THROTTLE_TTL);

    this.logger.log({
      level: "info",
      message: `Queueing refresh for ${staleMembers.length} stale members for user ${userId}`,
    });

    await Promise.all(
      staleMembers.map(async (member) => {
        if (!member.globalUserId) return;
        try {
          await this.membersService.queueMemberRefresh({
            discordId: member.userId,
            guildId: member.guildId,
            userId: member.globalUserId,
            priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
            reason: "guild-list-sync",
          });

          this.logger.log({
            level: "debug",
            message: `Queued refresh for member ${member.userId} in guild ${member.guildId}`,
          });
        } catch (error) {
          this.logger.log({
            level: "error",
            message: `Failed to queue refresh for member ${member.userId}`,
            stack: (error as Error).stack,
          });
        }
      }),
    );
  }
}

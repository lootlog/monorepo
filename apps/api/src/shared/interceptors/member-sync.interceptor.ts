import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { PrismaService } from 'src/db/prisma.service';
import { MEMBER_CACHE_SOFT_TTL } from 'src/members/constants/member-cache.constant';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { RoutingKey } from 'src/enum/routing-key.enum';

@Injectable()
export class MemberSyncInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MemberSyncInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
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
              this.logger.error(
                'Error queuing stale member refreshes',
                (error as Error).stack,
              );
            },
          );
        } catch (error) {
          this.logger.error(
            'Error in member sync interceptor',
            (error as Error).stack,
          );
        }
      }),
    );
  }

  private async queueStaleMemberRefreshes(
    discordId: string,
    userId: string,
    guilds: Array<{ id: string }>,
  ) {
    const guildIds = guilds.map((g) => g.id);
    const staleThreshold = new Date(Date.now() - MEMBER_CACHE_SOFT_TTL);

    const staleMembers = await this.prisma.member.findMany({
      where: {
        userId: discordId,
        guildId: { in: guildIds },
        globalUserId: { not: null },
        active: true,
        updatedAt: { lt: staleThreshold },
      },
      select: {
        userId: true,
        guildId: true,
        globalUserId: true,
        updatedAt: true,
      },
    });

    if (staleMembers.length === 0) {
      this.logger.debug(
        `No stale members found for user ${userId} in ${guildIds.length} guilds`,
      );
      return;
    }

    this.logger.log(
      `Queueing refresh for ${staleMembers.length} stale members for user ${userId}`,
    );

    for (const member of staleMembers) {
      try {
        await this.amqpConnection.publish(
          DEFAULT_EXCHANGE_NAME,
          RoutingKey.GUILDS_MEMBERS_REFRESH,
          {
            discordId: member.userId,
            guildId: member.guildId,
            userId: member.globalUserId,
          },
        );

        this.logger.debug(
          `Queued refresh for member ${member.userId} in guild ${member.guildId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to queue refresh for member ${member.userId}`,
          (error as Error).stack,
        );
      }
    }
  }
}

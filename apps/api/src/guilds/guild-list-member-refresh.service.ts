import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import type { RedisService } from "#src/redis/redis.service";
import { MEMBER_REFRESH_PRIORITY } from "#src/members/constants/member-refresh-queue.constant";
import type { MembersRepository } from "#src/members/members.repository";
import type { MembersService } from "#src/members/members.service";

const SYNC_THROTTLE_TTL_SECONDS = 600;

export class GuildListMemberRefreshService {
  constructor(
    private readonly logger: Pick<Logger, "log">,
    private readonly repository: Pick<MembersRepository, "findStaleMembers">,
    private readonly members: Pick<
      MembersService,
      "getMemberSoftStaleThreshold" | "queueMemberRefresh"
    >,
    private readonly redis: Pick<RedisService, "get" | "set">,
  ) {}

  async queue(
    discordId: string,
    userId: string,
    guilds: ReadonlyArray<{ id: string }>,
  ) {
    if (guilds.length === 0) return;
    const throttleKey = `member:sync:throttle:${discordId}`;
    if (await this.redis.get(throttleKey)) return;

    const staleMembers = await this.repository.findStaleMembers(
      discordId,
      guilds.map(({ id }) => id),
      this.members.getMemberSoftStaleThreshold(),
    );
    if (staleMembers.length === 0) return;

    await this.redis.set(throttleKey, "1", SYNC_THROTTLE_TTL_SECONDS);
    await Promise.all(
      staleMembers.map(async (member) => {
        if (!member.globalUserId) return;
        try {
          await this.members.queueMemberRefresh({
            discordId: member.userId,
            guildId: member.guildId,
            userId: member.globalUserId,
            priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
            reason: "guild-list-sync",
          });
        } catch (error) {
          this.logger.log({
            level: "error",
            message: `Failed to queue refresh for member ${member.userId}`,
            stack: error instanceof Error ? error.stack : String(error),
            userId,
          });
        }
      }),
    );
  }
}

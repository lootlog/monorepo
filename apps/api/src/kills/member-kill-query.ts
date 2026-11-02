import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type { AccessPolicy } from "@lootlog/domain/access-policy";
import { Effect, Schema } from "effect";
import type { ApplicationLogger } from "#src/shared/application-logger";
import {
  MemberKillsResponse,
  type MemberKillsQuery as GetMemberKillsDto,
} from "#src/contracts/kills/schemas";

import type { KillStatsPersistence } from "./kill-stats-persistence.js";
import {
  buildKillQueryCacheKey,
  buildNpcLevelFilter,
  cachedKillQuery,
  type KillQueryCache,
  type KillQueryRole,
  readableRoles,
  visibilityCacheScope,
  visibilityFilter,
} from "./kill-query-support.js";
import {
  getKillStatsPeriodStart,
  resolveKillStatsPeriod,
} from "./kill-stats-period.js";
import { decodeNpcKillPageCursor, toNpcKillPage } from "./npc-kill-page.js";
import { DEFAULT_PAGE_SIZE } from "#src/shared/keyset-page";

class MemberKillQueryError extends TaggedErrorClass<MemberKillQueryError>()(
  "MemberKillQueryError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeMemberKillQuery =
  (
    persistence: KillStatsPersistence,
    cache: KillQueryCache,
    logger: ApplicationLogger,
  ) =>
  (
    guildId: string,
    memberId: number,
    accessPolicy: AccessPolicy,
    roles: ReadonlyArray<KillQueryRole>,
    query: GetMemberKillsDto,
  ) => {
    const visibleRoles = readableRoles(roles);
    const visibility = visibilityFilter(accessPolicy, visibleRoles);
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const period = resolveKillStatsPeriod(query.period);
    const periodStart = getKillStatsPeriodStart(period);
    const { cursor, limit: _limit, ...filters } = { ...query, period };

    const filter = {
      guildId,
      memberId,
      ...(query.npcTypes &&
        query.npcTypes.length > 0 && {
          npcType: { in: query.npcTypes },
        }),
      ...(query.world && { world: query.world }),
      ...(query.search && {
        npcName: { contains: query.search, mode: "insensitive" as const },
      }),
      ...buildNpcLevelFilter(query.npcLevelMin, query.npcLevelMax),
      ...visibility,
      ...(periodStart && { periodStart: { gte: periodStart } }),
    };

    return decodeNpcKillPageCursor(cursor, filters).pipe(
      Effect.flatMap((after) =>
        cachedKillQuery({
          scopes: [`kill-stats:guild:${guildId}`],
          cache,
          logger,
          key: buildKillQueryCacheKey("member-kills", guildId, {
            memberId,
            filters,
            after,
            limit,
            visibility: visibilityCacheScope(accessPolicy, visibleRoles),
          }),
          label: "member kills",
          schema: MemberKillsResponse,
          load: Effect.gen(function* () {
            const member = yield* persistence.findMember(guildId, memberId);

            if (!member) return null;

            const { npcs, total, totalParticipations, participationsByType } =
              yield* persistence.findMemberNpcPage(filter, limit, after);

            const page = toNpcKillPage(npcs, limit, filters, undefined);

            return {
              member: {
                id: member.id,
                name: member.name,
                avatar: member.avatar,
                userId: member.userId,
              },
              overview: { totalParticipations, participationsByType },
              npcs: page.items,
              total,
              nextCursor: page.nextCursor,
            };
          }),
        }).pipe(
          Effect.mapError(
            (cause) =>
              new MemberKillQueryError({
                operation: "kills.member-query",
                cause,
              }),
          ),
        ),
      ),
      Effect.withSpan("kills.member-query", {
        attributes: { adapter: "kills", retryCount: 0 },
      }),
    );
  };

export type MemberKillQuery = ReturnType<typeof makeMemberKillQuery>;

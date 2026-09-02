import type { AccessPolicy } from "@lootlog/domain/access-policy";
import { Effect, Schema } from "effect";
import type { ApplicationLogger } from "#src/shared/logging/application-logger";
import type { GetMemberKillsDto } from "./dto/get-member-kills.dto.js";
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
import { getKillStatsPeriodStart } from "./utils/kill-stats-period.js";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class MemberKillQueryError extends Schema.TaggedError<MemberKillQueryError>()(
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
    const limit = query.limit ?? 20;
    const cursor = query.cursor ?? 0;
    const periodStart = getKillStatsPeriodStart(query.period);
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
      ...buildNpcLevelFilter(query.minLvl, query.maxLvl),
      ...visibility,
      ...(periodStart && { periodStart: { gte: periodStart } }),
    };

    return cachedKillQuery({
      cache,
      logger,
      key: buildKillQueryCacheKey("member-kills", guildId, {
        memberId,
        query,
        visibility: visibilityCacheScope(accessPolicy, visibleRoles),
      }),
      label: "member kills",
      load: Effect.gen(function* () {
        const member = yield* persistence.findMember(guildId, memberId);
        if (!member) return null;
        const stats = yield* persistence.findMemberStats(
          filter,
          periodStart !== undefined,
        );
        const participationsByType: Record<string, number> = {};
        let totalParticipations = 0;
        const npcMap = new Map<
          number,
          {
            npcId: number;
            npcName: string;
            npcType: string;
            npcLvl: number;
            npcProf: string | null;
            npcIcon: string | null;
            totalKills: number;
          }
        >();

        for (const stat of stats) {
          participationsByType[stat.npcType] =
            (participationsByType[stat.npcType] ?? 0) + stat.memberKills;
          totalParticipations += stat.memberKills;
          const existing = npcMap.get(stat.npcId);
          if (existing) {
            existing.totalKills += stat.memberKills;
            if (stat.npcLvl > existing.npcLvl) {
              existing.npcLvl = stat.npcLvl;
              existing.npcName = stat.npcName;
              existing.npcProf = stat.npcProf;
              existing.npcIcon = stat.npcIcon;
            }
          } else {
            npcMap.set(stat.npcId, {
              npcId: stat.npcId,
              npcName: stat.npcName,
              npcType: stat.npcType,
              npcLvl: stat.npcLvl,
              npcProf: stat.npcProf,
              npcIcon: stat.npcIcon,
              totalKills: stat.memberKills,
            });
          }
        }

        const allNpcs = Array.from(npcMap.values()).sort(
          (left, right) => right.totalKills - left.totalKills,
        );
        const total = allNpcs.length;
        return {
          member: {
            memberId: member.id,
            memberName: member.name,
            memberAvatar: member.avatar,
            memberUserId: member.userId,
          },
          overview: { totalParticipations, participationsByType },
          npcs: allNpcs.slice(cursor, cursor + limit),
          pagination: {
            total,
            cursor,
            limit,
            hasNext: cursor + limit < total,
          },
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
      Effect.withSpan("kills.member-query", {
        attributes: { adapter: "kills", retryCount: 0 },
      }),
    );
  };

export type MemberKillQuery = ReturnType<typeof makeMemberKillQuery>;

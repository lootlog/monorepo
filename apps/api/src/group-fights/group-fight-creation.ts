import { requireRetainedGroupFight } from "./group-fight-retention.js";
import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { Effect } from "effect";
import {
  getGroupFightMapNpcs,
  getGroupFightNpcType,
} from "@lootlog/domain/group-fight-maps";
import {
  calculateGroupFightDurationSeconds,
  calculateGroupFightParticipationSeconds,
  countGroupFightTeamSizes,
  isGroupFightTeam,
  resolveGroupFightParticipantResult,
  resolveGroupFightResolution,
} from "@lootlog/domain/group-fights";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  groupFightTable,
  groupFightParticipantTable,
  groupFightSubmissionTable,
} from "#src/database/drizzle/schema";
import type { CreateGroupFightRequest } from "#src/contracts/group-fights/schemas";
import { buildGroupFightKey } from "./group-fight-key.js";

export const makeGroupFightCreation =
  (database: typeof ApiDatabase.Service) =>
  (guildId: string, userId: string, payload: CreateGroupFightRequest) =>
    database.transaction((transaction) =>
      Effect.gen(function* () {
        yield* requireRetainedGroupFight(payload.endedAt);
        const fightKey = buildGroupFightKey(payload);
        const submissionKey = createHash("sha256")
          .update(JSON.stringify([userId, payload.submissionKey]))
          .digest("hex");
        // Both keys are scoped to the Organization. Locks live only for this transaction.
        yield* transaction.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${guildId + ":" + submissionKey}, 0))`,
        );
        yield* transaction.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${guildId + ":" + fightKey}, 0))`,
        );
        const [prior] = yield* transaction
          .select()
          .from(groupFightSubmissionTable)
          .where(
            and(
              eq(groupFightSubmissionTable.guildId, guildId),
              eq(groupFightSubmissionTable.submissionKey, submissionKey),
            ),
          )
          .limit(1);
        if (prior)
          return {
            guildId,
            groupFightId: prior.groupFightId,
            deduplicated: true,
          };
        let [fight] = yield* transaction
          .select()
          .from(groupFightTable)
          .where(
            and(
              eq(groupFightTable.guildId, guildId),
              eq(groupFightTable.fightKey, fightKey),
            ),
          )
          .limit(1);
        const deduplicated = fight !== undefined;
        const incomingStart = new Date(payload.startedAt);
        const startedAt =
          fight && fight.startedAt < incomingStart
            ? fight.startedAt
            : incomingStart;
        const endedAt = new Date(payload.endedAt);
        const sizes = countGroupFightTeamSizes(payload.participants);
        const initialResolution = resolveGroupFightResolution(payload);
        const mapNpcs = [...getGroupFightMapNpcs(payload.map.name)];
        const observedNpc = payload.qualification.npc;
        const observedNpcType = getGroupFightNpcType(observedNpc?.wt);
        if (
          observedNpc &&
          observedNpcType &&
          !mapNpcs.some(
            (npc) =>
              npc.name === observedNpc.name && npc.npcType === observedNpcType,
          )
        ) {
          mapNpcs.push({
            name: observedNpc.name,
            npcType: observedNpcType,
            lvl: observedNpc.lvl ?? 0,
            icon: observedNpc.icon ?? "",
          });
        }
        if (!fight) {
          [fight] = yield* transaction
            .insert(groupFightTable)
            .values({
              guildId,
              world: payload.world,
              fightKey,
              mapId: payload.map.id,
              mapName: payload.map.name,
              qualificationSource: payload.qualification.source,
              qualifyingNpcName: payload.qualification.npc?.name ?? null,
              mapNpcs,
              startedAt,
              endedAt,
              durationSeconds: calculateGroupFightDurationSeconds({
                startedAt: startedAt.getTime() / 1000,
                endedAt: endedAt.getTime() / 1000,
              }),
              teamOneSize: sizes.teamOne,
              teamTwoSize: sizes.teamTwo,
              outcome: initialResolution.outcome,
              winningTeam: payload.winningTeam,
              effectiveWinningTeam: initialResolution.effectiveWinningTeam,
              ourTeam: payload.myTeam,
              hasFlee: payload.participants.some((p) => p.fled),
              updatedAt: new Date(),
            })
            .returning();
        }
        if (!fight)
          return yield* Effect.fail(
            new Error("Group fight insert returned no row"),
          );
        yield* transaction
          .insert(groupFightParticipantTable)
          .values(
            payload.participants.map((p) => ({
              groupFightId: fight.id,
              characterId: p.characterId,
              accountId: p.accountId ?? null,
              name: p.name,
              prof: p.prof,
              lvl: p.lvl,
              icon: p.icon,
              team: p.team,
              result: resolveGroupFightParticipantResult(
                p,
                initialResolution.effectiveWinningTeam,
              ),
              fled: p.fled,
              joinedAt: new Date(p.joinedAt),
              participationSeconds: 0,
            })),
          )
          .onConflictDoUpdate({
            target: [
              groupFightParticipantTable.groupFightId,
              groupFightParticipantTable.characterId,
            ],
            set: {
              fled: sql`${groupFightParticipantTable.fled} OR excluded."fled"`,
              joinedAt: sql`least(${groupFightParticipantTable.joinedAt}, excluded."joinedAt")`,
              accountId: sql`coalesce(${groupFightParticipantTable.accountId}, excluded."accountId")`,
            },
          });
        const participants = yield* transaction
          .select()
          .from(groupFightParticipantTable)
          .where(eq(groupFightParticipantTable.groupFightId, fight.id));
        const winningTeam = isGroupFightTeam(fight.winningTeam)
          ? fight.winningTeam
          : payload.winningTeam;
        const resolution = resolveGroupFightResolution({
          winningTeam,
          participants,
        });
        yield* transaction
          .update(groupFightTable)
          .set({
            startedAt,
            durationSeconds: calculateGroupFightDurationSeconds({
              startedAt: startedAt.getTime() / 1000,
              endedAt: endedAt.getTime() / 1000,
            }),
            winningTeam,
            ...resolution,
            hasFlee: participants.some((p) => p.fled),
            updatedAt: new Date(),
          })
          .where(eq(groupFightTable.id, fight.id));
        for (const participant of participants) {
          yield* transaction
            .update(groupFightParticipantTable)
            .set({
              result: resolveGroupFightParticipantResult(
                participant,
                resolution.effectiveWinningTeam,
              ),
              participationSeconds: calculateGroupFightParticipationSeconds({
                startedAt: startedAt.getTime() / 1000,
                endedAt: endedAt.getTime() / 1000,
                joinedAt: participant.joinedAt.getTime() / 1000,
              }),
            })
            .where(eq(groupFightParticipantTable.id, participant.id));
        }
        yield* transaction.insert(groupFightSubmissionTable).values({
          groupFightId: fight.id,
          guildId,
          userId,
          accountId: payload.accountId,
          characterId: payload.characterId,
          team: payload.myTeam,
          battleId: payload.battleId ?? null,
          submissionKey,
        });
        return { guildId, groupFightId: fight.id, deduplicated };
      }),
    );

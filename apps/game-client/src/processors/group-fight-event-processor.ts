import type { GameEvent } from "@lootlog/margonem/game-events";
import {
  isGroupFightMap,
  isGroupFightNpcWeight,
  isQualifyingGroupFightMap,
} from "@lootlog/domain/group-fight-maps";
import {
  countGroupFightTeamSizes,
  getOpposingGroupFightTeam,
  isGroupFightComposition,
  isGroupFightTeam,
  parseGroupFightOutcomeMove,
  resolveGroupFightTeamFromNames,
  type GroupFightOutcomeMove,
} from "@lootlog/domain/group-fights";
import {
  createGroupFight,
  type CreateGroupFightOptions,
} from "@/api/group-fights.api";
import { isGroupFightCollectionEnabled } from "@/lib/group-fight-settings";
import type { RuntimeIngressSnapshot } from "@/lib/margonem-runtime/runtime.types";
import { mergeBattleWarriorPatches } from "@/hooks/game-events/helpers/battle.helpers";
import type { BattleWarriorsWithAccountId } from "@/store/game-store/battle.store";
import { useGameStore } from "@/store/game.store";
import { useNpcsStore } from "@/store/npcs.store";

type Capture = {
  context: Pick<
    CreateGroupFightOptions,
    | "world"
    | "accountId"
    | "characterId"
    | "submissionKey"
    | "map"
    | "qualification"
    | "startedAt"
  >;
  warriors: BattleWarriorsWithAccountId;
  joinedAt: Map<string, string>;
  fled: Set<string>;
  outcome: Exclude<GroupFightOutcomeMove, { kind: "flee" }> | null;
};

function eventTime(event: GameEvent): string | null {
  if (
    typeof event.ev !== "number" ||
    !Number.isFinite(event.ev) ||
    event.ev <= 0
  )
    return null;
  const date = new Date(event.ev * 1000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

/** Retains at most twenty participants and one result marker, never battle turns. */
export class GroupFightEventProcessor {
  private capture: Capture | null = null;
  private readonly recentEndings = new Set<string>();

  handle(event: GameEvent, ingress?: RuntimeIngressSnapshot): void {
    const fight = event.f;
    if (!fight) return;
    if (!isGroupFightCollectionEnabled()) {
      this.capture = null;
      return;
    }
    const timestamp = eventTime(event);
    if (fight.init === "1")
      this.capture = timestamp ? this.begin(timestamp, ingress) : null;
    const capture = this.capture;
    if (!capture) return;
    const game = ingress?.game ?? useGameStore.getState().game;
    if (
      !game ||
      game.world !== capture.context.world ||
      game.hero.characterId !== capture.context.characterId ||
      game.hero.accountId !== capture.context.accountId
    ) {
      this.capture = null;
      return;
    }

    if (!this.collect(capture, fight, timestamp, ingress)) {
      this.capture = null;
      return;
    }
    if (fight.endBattle !== 1) return;
    this.capture = null;
    if (!timestamp || timestamp < capture.context.startedAt) return;
    this.submit(capture, timestamp);
  }

  private collect(
    capture: Capture,
    fight: NonNullable<GameEvent["f"]>,
    timestamp: string | null,
    ingress?: RuntimeIngressSnapshot,
  ): boolean {
    if (fight.w) {
      const ids = Object.keys(fight.w);
      const totalIds = new Set([...Object.keys(capture.warriors), ...ids]);
      if (
        totalIds.size > 20 ||
        ids.some((id) => !/^\d+$/.test(id) || Number(id) <= 0)
      ) {
        return false;
      }
      for (const id of ids) {
        if (!capture.joinedAt.has(id)) {
          if (!timestamp) {
            return false;
          }
          capture.joinedAt.set(id, timestamp);
        }
      }
      capture.warriors = mergeBattleWarriorPatches(
        fight.w,
        capture.warriors,
        ingress,
      );
    }
    if ((fight.m?.length ?? 0) > 4096) {
      return false;
    }
    let bytes = 0;
    for (const row of fight.m ?? []) {
      bytes += row.length;
      if (bytes > 262144) {
        return false;
      }
      const move = parseGroupFightOutcomeMove(row);
      if (move?.kind === "flee") {
        if (move.actorId && capture.joinedAt.has(move.actorId))
          capture.fled.add(move.actorId);
      } else if (move) capture.outcome = move;
    }
    return true;
  }

  private submit(capture: Capture, timestamp: string): void {
    const payload = this.finish(capture, timestamp);
    if (!payload) return;
    const endingKey = `${payload.world}:${payload.map.id}:${timestamp}:${payload.participants
      .map((participant) => `${participant.characterId}:${participant.team}`)
      .sort()
      .join(",")}`;
    if (this.recentEndings.has(endingKey)) return;
    this.recentEndings.add(endingKey);
    if (this.recentEndings.size > 20) {
      const oldest = this.recentEndings.values().next().value;
      if (oldest !== undefined) this.recentEndings.delete(oldest);
    }
    void createGroupFight(payload).catch(() => {
      console.warn(
        "[GroupFightEventProcessor] Group fight submission failed; see request history.",
      );
    });
  }

  private begin(
    startedAt: string,
    ingress?: RuntimeIngressSnapshot,
  ): Capture | null {
    const game = ingress?.game ?? useGameStore.getState().game;
    if (!game || game.map.pvp !== 2) return null;
    const npcs = ingress?.npcsById ?? useNpcsStore.getState().npcsById;
    const observedNpc = Object.values(npcs)
      .slice(0, 1000)
      .find((npc) => isGroupFightNpcWeight(npc.weight));
    if (
      !isQualifyingGroupFightMap({
        name: game.map.name,
        pvp: game.map.pvp,
        observedNpcWeight: observedNpc?.weight,
      })
    )
      return null;
    const qualification: CreateGroupFightOptions["qualification"] =
      isGroupFightMap(game.map.name)
        ? { source: "CATALOG" }
        : {
            source: "NPC_OBSERVED",
            ...(observedNpc
              ? {
                  npc: {
                    id: observedNpc.id,
                    name: observedNpc.name,
                    wt: observedNpc.weight,
                  },
                }
              : {}),
          };
    return {
      context: {
        world: game.world,
        accountId: game.hero.accountId,
        characterId: game.hero.characterId,
        submissionKey: crypto.randomUUID(),
        map: { id: game.map.id, name: game.map.name, pvp: game.map.pvp },
        qualification,
        startedAt,
      },
      warriors: {},
      joinedAt: new Map(),
      fled: new Set(),
      outcome: null,
    };
  }

  private finish(
    capture: Capture,
    endedAt: string,
  ): CreateGroupFightOptions | null {
    const participants: CreateGroupFightOptions["participants"] = [];
    for (const [id, warrior] of Object.entries(capture.warriors)) {
      const joinedAt = capture.joinedAt.get(id);
      if (
        !joinedAt ||
        joinedAt > endedAt ||
        !isGroupFightTeam(warrior.team) ||
        !warrior.name ||
        !Number.isSafeInteger(warrior.lvl) ||
        warrior.lvl < 0
      )
        return null;
      participants.push({
        characterId: id,
        accountId:
          warrior.accountId === undefined
            ? undefined
            : String(warrior.accountId),
        name: warrior.name,
        lvl: warrior.lvl,
        prof: warrior.prof ?? "",
        icon: warrior.icon ?? "",
        team: warrior.team,
        joinedAt,
        fled: capture.fled.has(id),
      });
    }
    if (!isGroupFightComposition(countGroupFightTeamSizes(participants)))
      return null;
    const myTeam = participants.find(
      (participant) => participant.characterId === capture.context.characterId,
    )?.team;
    if (!myTeam) return null;
    const namedTeam = capture.outcome
      ? resolveGroupFightTeamFromNames(
          capture.outcome.names,
          participants.map((participant) => ({
            ...participant,
            id: participant.characterId,
          })),
        )
      : null;
    const winningTeam =
      capture.outcome?.kind === "loser" && namedTeam
        ? getOpposingGroupFightTeam(namedTeam)
        : namedTeam;
    return { ...capture.context, endedAt, participants, myTeam, winningTeam };
  }
}

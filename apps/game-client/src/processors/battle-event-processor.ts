import { createSHA256Hash } from "@/helpers/create-sha-256-hash";
import { mapBattleEventsToPayload } from "@/helpers/mappers/battlelog.mappers";
import { LOOTLOG_APP_URL } from "@/config/app";
import { getNpcTypeByWt } from "@lootlog/types";
import { NpcType } from "@/api/npcs.api";
import { mergeBattleWarriorPatches } from "@/hooks/game-events/helpers/battle.helpers";
import { useGameStore } from "@/store/game.store";
import type { RuntimeIngressSnapshot } from "@/lib/margonem-runtime/runtime.types";
import { useBattlePanelStore } from "@/store/battle-panel.store";
import {
  useBattleStore,
  type BattleWarriorsWithAccountId,
} from "@/store/game-store/battle.store";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { createKill, createBattle } from "@/api";
import { toast } from "sonner";
import { getFixedT } from "@/i18n/get-fixed-t";

const TRACKABLE_NPC_TYPES = new Set([
  NpcType.ELITE2,
  NpcType.ELITE3,
  NpcType.HERO,
  NpcType.COLOSSUS,
  NpcType.TITAN,
]);
const BATTLE_REPLAY_WINDOW_MS = 10_000;

const showBattleCreatedToast = (battleId: string) => {
  const t = getFixedT("timers");
  const battleUrl = `${LOOTLOG_APP_URL}/@me/battle-panel/battles/${battleId}`;

  toast(t("messages.battleLinkCreated"), {
    duration: 10000,
    action: {
      label: t("messages.copyBattleLink"),
      onClick: () => {
        navigator.clipboard.writeText(battleUrl);
        toast.success(t("messages.battleLinkCopied"));
      },
    },
  });
};

const parseNumericValue = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsedValue = Number.parseFloat(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
};

const deduplicateBattleEvents = (events: GameEvent[]): GameEvent[] => {
  const seenEventPayloads = new Set<string>();

  return events.filter((event) => {
    if (event.ev === undefined) return true;
    const eventPayload = JSON.stringify(event);
    if (seenEventPayloads.has(eventPayload)) return false;
    seenEventPayloads.add(eventPayload);
    return true;
  });
};

const isWarriorDead = (warrior: BattleWarriorsWithAccountId[string]) => {
  const legacyHpp = parseNumericValue((warrior as { hpp?: unknown }).hpp);
  if (legacyHpp !== null) return legacyHpp <= 0;

  const hpData = (warrior as { hp?: { hpp?: unknown; cur?: unknown } }).hp;
  const nestedHpp = parseNumericValue(hpData?.hpp);
  if (nestedHpp !== null) return nestedHpp <= 0;

  const currentHp = parseNumericValue(hpData?.cur);
  if (currentHp !== null) return currentHp <= 0;

  return false;
};

type DeadNpc = {
  id: number;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
  wt: number;
  type: number;
};

const getNpcBattleSummary = (warriors: BattleWarriorsWithAccountId) => {
  const deadNpcs: Array<{
    id: number;
    name: string;
    lvl: number;
    prof: string;
    icon: string;
    wt: number;
    type: number;
  }> = [];
  let hasNpcInBattle = false;
  let topNpc: DeadNpc | null = null;

  for (const [key, warrior] of Object.entries(warriors)) {
    if (!key.startsWith("-")) {
      continue;
    }

    hasNpcInBattle = true;

    if (!isWarriorDead(warrior)) {
      continue;
    }

    const deadNpc = {
      id: Number.parseInt(key, 10),
      name: warrior.name,
      lvl: warrior.lvl,
      prof: warrior.prof || "",
      icon: warrior.icon,
      wt: warrior.wt,
      type: warrior.type,
    };

    deadNpcs.push(deadNpc);

    if (!topNpc || deadNpc.wt > topNpc.wt) {
      topNpc = deadNpc;
    }
  }

  return {
    deadNpcs,
    hasNpcInBattle,
    topNpc,
  };
};

export class BattleEventProcessor {
  private readonly recentBattleReplayKeys = new Map<string, number>();
  private observedTeams = new Set<number>();
  private hasMultipleTeams = false;
  private hasWarnedCaptureOverflow = false;
  private battleGeneration = 0;
  private finalizingGeneration: number | null = null;

  async handle(
    event: GameEvent,
    ingress?: RuntimeIngressSnapshot,
  ): Promise<void> {
    if (!event.f) return;

    const battlePanelStore = useBattlePanelStore.getState();
    const battleStore = useBattleStore.getState();
    const stateAtIngress = useBattleStore.getState();
    const startsBattle = event.f.init === "1";

    if (startsBattle) {
      this.battleGeneration += 1;
      battleStore.clearEvents();
      this.observedTeams.clear();
      this.hasMultipleTeams = false;
      this.hasWarnedCaptureOverflow = false;
    }

    let battleWarriors = startsBattle ? {} : stateAtIngress.battleWarriors;
    if (event.f.w) {
      battleWarriors = mergeBattleWarriorPatches(
        event.f.w,
        battleWarriors,
        ingress,
      );

      // Incremental team detection — O(1) amortized instead of O(N*M)
      if (!this.hasMultipleTeams) {
        for (const warrior of Object.values(event.f.w)) {
          if (warrior.team !== undefined) {
            this.observedTeams.add(warrior.team);
            if (this.observedTeams.size > 1) {
              this.hasMultipleTeams = true;
              break;
            }
          }
        }
      }
    }

    const battleState = startsBattle ? "in-battle" : stateAtIngress.battleState;
    const endsBattle = event.f.endBattle === 1 && battleState === "in-battle";

    if (endsBattle && this.finalizingGeneration === this.battleGeneration) {
      return;
    }

    if (battlePanelStore.isBattleCollectionEnabled) {
      battleStore.addEvent(event);
    }

    if (!endsBattle) {
      battleStore.applyBatch({
        battleState: startsBattle ? "in-battle" : undefined,
        battleWarriors: startsBattle || event.f.w ? battleWarriors : undefined,
      });
      return;
    }

    const endingGeneration = this.battleGeneration;
    this.finalizingGeneration = endingGeneration;
    const capture = battlePanelStore.isBattleCollectionEnabled
      ? battleStore.getCaptureSnapshot()
      : null;

    if (event.f.w) {
      battleStore.applyBatch({ battleWarriors });
    }

    try {
      const { deadNpcs, hasNpcInBattle, topNpc } =
        getNpcBattleSummary(battleWarriors);
      let nextLastKillHash = stateAtIngress.lastKillHash;
      let nextLastBattleHash = stateAtIngress.lastBattleHash;
      let killIntent: Parameters<typeof createKill>[0] | null = null;
      let battleIntent: Parameters<typeof createBattle>[0] | null = null;

      // Kill tracking — always runs regardless of isBattleCollectionEnabled
      if (hasNpcInBattle && topNpc) {
        const npcType = getNpcTypeByWt(
          NpcType,
          topNpc.wt,
          topNpc.prof,
          topNpc.type,
        );

        if (TRACKABLE_NPC_TYPES.has(npcType)) {
          // Kill hash includes timestamp to prevent ignoring repeat kills of same respawned monster
          const killHash = await createSHA256Hash(
            JSON.stringify({
              ids: deadNpcs.map((npc) => npc.id).sort(),
              ts: Date.now(),
            }),
          );

          if (killHash !== nextLastKillHash) {
            const game = ingress?.game ?? useGameStore.getState().game;
            if (game) {
              const { type: _, ...npcWithoutType } = topNpc;
              killIntent = {
                world: game.world,
                npc: npcWithoutType,
                characterId: game.hero.characterId,
                accountId: game.hero.accountId,
              };
            }
            nextLastKillHash = killHash;
          }
        }
      }

      // Battle logging — only if enabled
      if (capture) {
        if (capture.overflowed) {
          if (!this.hasWarnedCaptureOverflow) {
            this.hasWarnedCaptureOverflow = true;
            console.warn(
              "[BattleEventProcessor] Battle capture exceeded its safety budget; skipping the partial payload.",
            );
          }
        } else {
          const game = ingress?.game ?? useGameStore.getState().game;
          if (game) {
            const accountId = game.hero.accountId;
            const characterId = game.hero.characterId;
            const world = game.world;
            const battleHash = await createSHA256Hash(
              JSON.stringify(capture.turns),
            );
            const canonicalCapturedEvents = deduplicateBattleEvents(
              capture.events,
            );
            const canonicalTurns = canonicalCapturedEvents.flatMap(
              (event) => event.f?.m ?? [],
            );
            const events = mapBattleEventsToPayload(canonicalCapturedEvents);

            if (events && !hasNpcInBattle && this.hasMultipleTeams) {
              const submissionId = await createSHA256Hash(
                JSON.stringify({
                  accountId,
                  characterId,
                  moves: canonicalTurns,
                  world,
                }),
              );

              battleIntent = {
                accountId,
                characterId,
                submissionId,
                events,
                world,
              };
            }
            nextLastBattleHash = battleHash;
          }
        }
      }

      if (endingGeneration !== this.battleGeneration) {
        return;
      }

      if (battleIntent) {
        if (this.hasRecentBattleReplayKey(battleIntent.submissionId)) {
          battleIntent = null;
        } else {
          this.recentBattleReplayKeys.set(
            battleIntent.submissionId,
            Date.now(),
          );
        }
      }

      battleStore.clearEvents();
      battleStore.applyBatch({
        battleState: "idle",
        battleWarriors,
        lastBattleHash: nextLastBattleHash,
        lastKillHash: nextLastKillHash,
      });

      if (killIntent) {
        createKill(killIntent).catch((error) => {
          console.warn("[BattleEventProcessor] Failed to create kill:", error);
        });
      }

      if (battleIntent) {
        createBattle(battleIntent)
          .then((response) => {
            showBattleCreatedToast(response.battleId);
          })
          .catch((error) => {
            console.warn(
              "[BattleEventProcessor] Failed to create battle:",
              error,
            );
          });
      }
    } finally {
      if (this.finalizingGeneration === endingGeneration) {
        this.finalizingGeneration = null;
      }
    }
  }

  private hasRecentBattleReplayKey(battleReplayKey: string): boolean {
    const now = Date.now();
    for (const [key, observedAt] of this.recentBattleReplayKeys) {
      if (now - observedAt >= BATTLE_REPLAY_WINDOW_MS) {
        this.recentBattleReplayKeys.delete(key);
      }
    }
    return this.recentBattleReplayKeys.has(battleReplayKey);
  }
}

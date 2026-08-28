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

type BattleStoreState = ReturnType<typeof useBattleStore.getState>;
type BattleCapture = ReturnType<BattleStoreState["getCaptureSnapshot"]>;
type BattleData = NonNullable<GameEvent["f"]>;
type KillIntent = Parameters<typeof createKill>[0];
type BattleIntent = Parameters<typeof createBattle>[0];
type KillResolution = {
  intent: KillIntent | null;
  lastKillHash: string | undefined;
};

const isPromise = <Value>(
  value: Value | Promise<Value>,
): value is Promise<Value> => value instanceof Promise;

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

    this.beginBattleIfNeeded(startsBattle, battleStore);
    const battleWarriors = this.resolveBattleWarriors({
      battleData: event.f,
      currentWarriors: stateAtIngress.battleWarriors,
      ingress,
      startsBattle,
    });

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
      const pendingKillResult = this.resolveKillIntent({
        deadNpcs,
        hasNpcInBattle,
        ingress,
        lastKillHash: stateAtIngress.lastKillHash,
        topNpc,
      });
      const killResult = isPromise(pendingKillResult)
        ? await pendingKillResult
        : pendingKillResult;
      const battleResult = await this.resolveBattleIntent({
        capture,
        hasNpcInBattle,
        ingress,
        lastBattleHash: stateAtIngress.lastBattleHash,
      });

      if (endingGeneration !== this.battleGeneration) {
        return;
      }

      const battleIntent = this.deduplicateBattleIntent(battleResult.intent);

      battleStore.clearEvents();
      battleStore.applyBatch({
        battleState: "idle",
        battleWarriors,
        lastBattleHash: battleResult.lastBattleHash,
        lastKillHash: killResult.lastKillHash,
      });

      this.submitIntents(killResult.intent, battleIntent);
    } finally {
      if (this.finalizingGeneration === endingGeneration) {
        this.finalizingGeneration = null;
      }
    }
  }

  private beginBattleIfNeeded(
    startsBattle: boolean,
    battleStore: BattleStoreState,
  ): void {
    if (!startsBattle) return;
    this.battleGeneration += 1;
    battleStore.clearEvents();
    this.observedTeams.clear();
    this.hasMultipleTeams = false;
    this.hasWarnedCaptureOverflow = false;
  }

  private resolveBattleWarriors(params: {
    battleData: BattleData;
    currentWarriors: BattleWarriorsWithAccountId;
    ingress?: RuntimeIngressSnapshot;
    startsBattle: boolean;
  }): BattleWarriorsWithAccountId {
    let warriors = params.startsBattle ? {} : params.currentWarriors;
    if (!params.battleData.w) return warriors;

    warriors = mergeBattleWarriorPatches(
      params.battleData.w,
      warriors,
      params.ingress,
    );
    this.observeBattleTeams(params.battleData.w);
    return warriors;
  }

  private observeBattleTeams(warriors: NonNullable<BattleData["w"]>): void {
    if (this.hasMultipleTeams) return;
    for (const warrior of Object.values(warriors)) {
      if (warrior.team === undefined) continue;
      this.observedTeams.add(warrior.team);
      if (this.observedTeams.size > 1) {
        this.hasMultipleTeams = true;
        return;
      }
    }
  }

  private resolveKillIntent(params: {
    deadNpcs: DeadNpc[];
    hasNpcInBattle: boolean;
    ingress?: RuntimeIngressSnapshot;
    lastKillHash: string | undefined;
    topNpc: DeadNpc | null;
  }): KillResolution | Promise<KillResolution> {
    if (!params.hasNpcInBattle || !params.topNpc) {
      return { intent: null, lastKillHash: params.lastKillHash };
    }
    const npcType = getNpcTypeByWt(
      NpcType,
      params.topNpc.wt,
      params.topNpc.prof,
      params.topNpc.type,
    );
    if (!TRACKABLE_NPC_TYPES.has(npcType)) {
      return { intent: null, lastKillHash: params.lastKillHash };
    }

    return createSHA256Hash(
      JSON.stringify({
        ids: params.deadNpcs.map((npc) => npc.id).sort(),
        ts: Date.now(),
      }),
    ).then((killHash) => this.resolveHashedKillIntent(params, killHash));
  }

  private resolveHashedKillIntent(
    params: {
      deadNpcs: DeadNpc[];
      hasNpcInBattle: boolean;
      ingress?: RuntimeIngressSnapshot;
      lastKillHash: string | undefined;
      topNpc: DeadNpc | null;
    },
    killHash: string,
  ): KillResolution {
    if (killHash === params.lastKillHash) {
      return { intent: null, lastKillHash: params.lastKillHash };
    }

    const game = params.ingress?.game ?? useGameStore.getState().game;
    if (!game) return { intent: null, lastKillHash: killHash };
    if (!params.topNpc) {
      return { intent: null, lastKillHash: killHash };
    }
    const { type: _, ...npcWithoutType } = params.topNpc;
    return {
      intent: {
        world: game.world,
        npc: npcWithoutType,
        characterId: game.hero.characterId,
        accountId: game.hero.accountId,
      },
      lastKillHash: killHash,
    };
  }

  private async resolveBattleIntent(params: {
    capture: BattleCapture | null;
    hasNpcInBattle: boolean;
    ingress?: RuntimeIngressSnapshot;
    lastBattleHash: string | undefined;
  }): Promise<{
    intent: BattleIntent | null;
    lastBattleHash: string | undefined;
  }> {
    if (!params.capture) {
      return { intent: null, lastBattleHash: params.lastBattleHash };
    }
    if (params.capture.overflowed) {
      this.warnCaptureOverflow();
      return { intent: null, lastBattleHash: params.lastBattleHash };
    }

    const game = params.ingress?.game ?? useGameStore.getState().game;
    if (!game) return { intent: null, lastBattleHash: params.lastBattleHash };

    const { accountId, characterId } = game.hero;
    const { world } = game;
    const battleHash = await createSHA256Hash(
      JSON.stringify(params.capture.turns),
    );
    const events = mapBattleEventsToPayload(params.capture.events);
    if (!events || params.hasNpcInBattle || !this.hasMultipleTeams) {
      return { intent: null, lastBattleHash: battleHash };
    }
    const submissionId = await createSHA256Hash(
      JSON.stringify({
        accountId,
        characterId,
        moves: params.capture.turns,
        world,
      }),
    );
    return {
      intent: { accountId, characterId, submissionId, events, world },
      lastBattleHash: battleHash,
    };
  }

  private warnCaptureOverflow(): void {
    if (this.hasWarnedCaptureOverflow) return;
    this.hasWarnedCaptureOverflow = true;
    console.warn(
      "[BattleEventProcessor] Battle capture exceeded its safety budget; skipping the partial payload.",
    );
  }

  private deduplicateBattleIntent(
    intent: BattleIntent | null,
  ): BattleIntent | null {
    if (!intent) return null;
    if (this.hasRecentBattleReplayKey(intent.submissionId)) return null;
    this.recentBattleReplayKeys.set(intent.submissionId, Date.now());
    return intent;
  }

  private submitIntents(
    killIntent: KillIntent | null,
    battleIntent: BattleIntent | null,
  ): void {
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

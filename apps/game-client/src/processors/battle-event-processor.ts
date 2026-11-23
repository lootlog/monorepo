import { createSHA256Hash } from "@/helpers/create-sha-256-hash";
import { normalizeNpcIcon } from "@lootlog/domain/npc-icon";
import { mapBattleEventsToPayload } from "@/helpers/mappers/battlelog.mappers";
import { getNpcType } from "@lootlog/domain/npc-type";
import { NpcType } from "@/api/npcs.api";
import {
  isWarriorDead,
  mergeBattleWarriorPatches,
} from "@/hooks/game-events/helpers/battle.helpers";
import { useGameStore } from "@/store/game.store";
import type {
  RuntimeGameSnapshot,
  RuntimeIngressSnapshot,
} from "@/lib/margonem-runtime/runtime.types";
import { useBattlePanelStore } from "@/store/battle-panel.store";
import {
  useBattleStore,
  type BattleWarriorsWithAccountId,
} from "@/store/game-store/battle.store";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { createKill, createBattle, recordWeaponKills } from "@/api/battle.api";
import { findFinishingBlows } from "@lootlog/battle-processor/finishing-blows";
import { getHeroMainWeaponItemId } from "@/lib/margonem-runtime/adapters/item-tip-runtime-adapter";
import { setWeaponKills } from "@/lib/margonem-tooltips/weapon-kills";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
import { getFixedT } from "@/i18n/get-fixed-t";
import {
  getErrorStatusCode,
  logSkippedAction,
  shouldRetryLoggedActionStatus,
} from "@/lib/logs/log-actions";
import { GAME_EVENT_RETRY_OPTIONS } from "@/api/retry-policy";
import {
  claimBattleSubmission,
  releaseBattleSubmission,
} from "./battle-submission-ledger";

const TRACKABLE_NPC_TYPES: ReadonlySet<NpcType> = new Set([
  NpcType.ELITE2,
  NpcType.ELITE3,
  NpcType.HERO,
  NpcType.EVENT_HERO,
  NpcType.COLOSSUS,
  NpcType.TITAN,
]);

type BattleStoreState = ReturnType<typeof useBattleStore.getState>;

type BattleCapture = ReturnType<BattleStoreState["getCaptureSnapshot"]>;

type BattleData = NonNullable<GameEvent["f"]>;

type KillIntent = Parameters<typeof createKill>[0];

type BattleIntent = Parameters<typeof createBattle>[0];

type BattleEvents = BattleIntent["events"];

type WeaponKillsIntent = Parameters<typeof recordWeaponKills>[0];

type DeadNpc = {
  id: number;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
  wt: number;
  type: number;
  isHeroFromEvent?: boolean;
};

const toBattleNpc = (
  key: string,
  warrior: BattleWarriorsWithAccountId[string],
): DeadNpc => ({
  id: Number.parseInt(key, 10),
  name: warrior.name,
  lvl: warrior.lvl,
  prof: warrior.prof || "",
  icon: warrior.mapNpc?.icon ?? normalizeNpcIcon(warrior.icon),
  wt: warrior.wt,
  type: warrior.type,
  isHeroFromEvent: warrior.mapNpc?.isHeroFromEvent,
});

const getTrackableNpcType = (npc: DeadNpc): NpcType | null => {
  const npcType = getNpcType(NpcType, npc);

  return TRACKABLE_NPC_TYPES.has(npcType) ? npcType : null;
};

const getNpcBattleSummary = (warriors: BattleWarriorsWithAccountId) => {
  let hasNpcInBattle = false;
  let hasLivingNpc = false;
  let topNpc: DeadNpc | null = null;

  for (const [key, warrior] of Object.entries(warriors)) {
    if (!key.startsWith("-")) {
      continue;
    }

    hasNpcInBattle = true;

    if (!isWarriorDead(warrior)) {
      hasLivingNpc = true;
      continue;
    }

    const deadNpc = toBattleNpc(key, warrior);

    if (!topNpc || deadNpc.wt > topNpc.wt) {
      topNpc = deadNpc;
    }
  }

  return {
    hasLivingNpc,
    hasNpcInBattle,
    topNpc,
  };
};

const getTrackableNpcs = (
  warriors: BattleWarriorsWithAccountId,
  keys: Iterable<string> = Object.keys(warriors),
) =>
  Array.from(keys).flatMap((key) => {
    const warrior = warriors[key];

    if (!key.startsWith("-") || !warrior) return [];

    const npc = toBattleNpc(key, warrior);
    const npcType = getTrackableNpcType(npc);

    if (npcType === null) return [];

    return [
      {
        id: npc.id,
        name: npc.name,
        lvl: npc.lvl,
        type: npcType,
        dead: isWarriorDead(warrior),
      },
    ];
  });

const getBattleEnding = (
  battleData: BattleData,
  startsBattle: boolean,
): "ended" | "left" | null => {
  if (battleData.endBattle === 1) return "ended";

  return battleData.close !== undefined && !startsBattle ? "left" : null;
};

type BattleConclusion = "ended" | "left" | "interrupted";

const restartsCapturedBattle = (
  battleData: BattleData,
  capturedTurns: readonly string[],
  warriors: BattleWarriorsWithAccountId,
): boolean => {
  if (capturedTurns.length > 0) {
    const turns = battleData.m ?? [];

    return capturedTurns.every((turn, index) => turns[index] === turn);
  }

  return Object.keys(warriors).every(
    (key) => !key.startsWith("-") || battleData.w?.[key] !== undefined,
  );
};

type KillSkipReason =
  | "battle-start-not-seen"
  | "left-battle"
  | "missing-game"
  | "npc-alive";

const getKillSkipReason = (
  ending: BattleConclusion,
  game: RuntimeGameSnapshot | null,
): KillSkipReason => {
  if (!game) return "missing-game";

  return ending === "left" ? "left-battle" : "npc-alive";
};

export class BattleEventProcessor {
  private observedTeams = new Set<number>();
  private hasMultipleTeams = false;
  private hasNpcWarrior = false;
  private hasWarnedCaptureOverflow = false;
  private lastEndedBattleNpcKeys = new Set<string>();

  async handle(
    event: GameEvent,
    ingress?: RuntimeIngressSnapshot,
  ): Promise<void> {
    if (!event.f) return;

    const battlePanelStore = useBattlePanelStore.getState();
    const battleStore = useBattleStore.getState();
    const startsBattle = event.f.init === "1";
    const game = ingress?.game ?? useGameStore.getState().game;

    const interrupted = startsBattle
      ? this.concludeInterruptedBattle(event.f, battleStore, {
          collectsBattles: battlePanelStore.isBattleCollectionEnabled,
          game,
        })
      : null;

    this.beginBattleIfNeeded(startsBattle, battleStore);

    const battleWarriors = this.resolveBattleWarriors({
      battleData: event.f,
      currentWarriors: battleStore.battleWarriors,
      ingress,
      startsBattle,
    });

    const battleState = startsBattle ? "in-battle" : battleStore.battleState;

    const ending =
      battleState === "in-battle"
        ? getBattleEnding(event.f, startsBattle)
        : null;

    if (battleState === "in-battle" && !this.hasNpcWarrior) {
      battleStore.addEvent(event);
    }

    if (battleState !== "in-battle") {
      this.logUnseenBattleStart(event.f, battleWarriors, ingress);
    }

    if (!ending) {
      battleStore.applyBatch({
        battleState: startsBattle ? "in-battle" : undefined,
        battleWarriors: startsBattle || event.f.w ? battleWarriors : undefined,
      });

      await interrupted;

      return;
    }

    const capture = battleStore.getCaptureSnapshot();

    this.lastEndedBattleNpcKeys = new Set(
      Object.keys(battleWarriors).filter((key) => key.startsWith("-")),
    );

    const hasMultipleTeams = this.hasMultipleTeams;

    battleStore.clearEvents();
    battleStore.applyBatch({ battleState: "idle", battleWarriors });

    await Promise.all([
      interrupted,
      this.concludeBattle({
        battleWarriors,
        capture,
        collectsBattles: battlePanelStore.isBattleCollectionEnabled,
        conclusion: ending,
        game,
        hasMultipleTeams,
      }),
    ]);
  }

  private concludeInterruptedBattle(
    battleData: BattleData,
    battleStore: BattleStoreState,
    context: { collectsBattles: boolean; game: RuntimeGameSnapshot | null },
  ): Promise<void> | null {
    if (battleStore.battleState !== "in-battle") return null;

    const capture = battleStore.getCaptureSnapshot();

    if (
      restartsCapturedBattle(
        battleData,
        capture.turns,
        battleStore.battleWarriors,
      )
    ) {
      return null;
    }

    return this.concludeBattle({
      ...context,
      battleWarriors: battleStore.battleWarriors,
      capture,
      conclusion: "interrupted",
      hasMultipleTeams: this.hasMultipleTeams,
    });
  }

  private async concludeBattle(params: {
    battleWarriors: BattleWarriorsWithAccountId;
    capture: BattleCapture;
    collectsBattles: boolean;
    conclusion: BattleConclusion;
    game: RuntimeGameSnapshot | null;
    hasMultipleTeams: boolean;
  }): Promise<void> {
    const { battleWarriors, capture, conclusion, game } = params;

    const { hasLivingNpc, hasNpcInBattle, topNpc } =
      getNpcBattleSummary(battleWarriors);

    const pvpEvents = this.getPvpBattleEvents({
      capture,
      hasNpcInBattle,
      hasMultipleTeams: params.hasMultipleTeams,
    });

    const weaponKillsIntent = this.resolveWeaponKillsIntent(pvpEvents, game);

    const isKill =
      conclusion === "ended" || (conclusion === "interrupted" && !hasLivingNpc);

    const killIntent = this.resolveKillIntent(
      isKill ? topNpc : null,
      game,
      battleWarriors,
    );

    if (!killIntent) {
      this.logSkippedKill(
        getKillSkipReason(conclusion, game),
        getTrackableNpcs(battleWarriors),
        game,
      );
    }

    const battleIntent = await this.resolveBattleIntent({
      events: params.collectsBattles ? pvpEvents : null,
      turns: capture.turns,
      game,
    });

    this.submitIntents(
      killIntent,
      battleIntent && claimBattleSubmission(battleIntent.submissionId)
        ? battleIntent
        : null,
      weaponKillsIntent,
    );
  }

  private beginBattleIfNeeded(
    startsBattle: boolean,
    battleStore: BattleStoreState,
  ): void {
    if (!startsBattle) return;
    battleStore.clearEvents();
    this.observedTeams.clear();
    this.hasMultipleTeams = false;
    this.hasNpcWarrior = false;
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
    this.observeNpcWarriors(params.battleData.w);

    return warriors;
  }

  private observeNpcWarriors(warriors: NonNullable<BattleData["w"]>): void {
    if (this.hasNpcWarrior) return;

    for (const key in warriors) {
      if (!key.startsWith("-")) continue;
      this.hasNpcWarrior = true;
      useBattleStore.getState().clearEvents();

      return;
    }
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

  private logUnseenBattleStart(
    battleData: BattleData,
    battleWarriors: BattleWarriorsWithAccountId,
    ingress?: RuntimeIngressSnapshot,
  ): void {
    if (battleData.endBattle !== 1 || !battleData.w) return;

    const unseenKeys = Object.keys(battleData.w).filter(
      (key) => !this.lastEndedBattleNpcKeys.has(key),
    );

    this.logSkippedKill(
      "battle-start-not-seen",
      getTrackableNpcs(battleWarriors, unseenKeys),
      ingress?.game ?? useGameStore.getState().game,
    );
  }

  private logSkippedKill(
    reason: KillSkipReason,
    npcs: ReturnType<typeof getTrackableNpcs>,
    game: RuntimeGameSnapshot | null,
  ): void {
    if (npcs.length === 0) return;

    logSkippedAction({
      actionType: "create_kill",
      payload: {
        world: game?.world,
        characterId: game?.hero.characterId,
        npcs,
      },
      reason,
    });
  }

  private resolveKillIntent(
    topNpc: DeadNpc | null,
    game: RuntimeGameSnapshot | null,
    battleWarriors: BattleWarriorsWithAccountId,
  ): KillIntent | null {
    if (!topNpc || !game) return null;

    if (getTrackableNpcType(topNpc) === null) return null;

    const { type: _, ...npcWithoutType } = topNpc;

    return {
      world: game.world,
      npc: npcWithoutType,
      characterId: game.hero.characterId,
      accountId: game.hero.accountId,
      party: Object.entries(battleWarriors).flatMap(([key, warrior]) =>
        key.startsWith("-")
          ? []
          : [
              {
                prof: warrior.prof,
                lvl: warrior.lvl,
                alive: !isWarriorDead(warrior),
              },
            ],
      ),
      character: {
        name: game.hero.name,
        lvl: game.hero.level,
        prof: game.hero.profession,
        icon: game.hero.icon,
      },
    };
  }

  private getPvpBattleEvents(params: {
    capture: BattleCapture;
    hasNpcInBattle: boolean;
    hasMultipleTeams: boolean;
  }): BattleEvents | null {
    if (params.hasNpcInBattle || !params.hasMultipleTeams) return null;

    if (params.capture.overflowed) {
      this.warnCaptureOverflow();

      return null;
    }

    return mapBattleEventsToPayload(params.capture.events);
  }

  private async resolveBattleIntent(params: {
    events: BattleEvents | null;
    turns: string[];
    game: RuntimeGameSnapshot | null;
  }): Promise<BattleIntent | null> {
    const { events, game } = params;

    if (!events || !game) return null;

    const { accountId, characterId } = game.hero;
    const { world } = game;

    const submissionId = await createSHA256Hash(
      JSON.stringify({
        accountId,
        characterId,
        moves: params.turns,
        world,
      }),
    );

    return { accountId, characterId, submissionId, events, world };
  }

  private resolveWeaponKillsIntent(
    events: BattleEvents | null,
    game: RuntimeGameSnapshot | null,
  ): WeaponKillsIntent | null {
    if (!events || !game) return null;

    const { accountId, characterId } = game.hero;

    const hasFinishingBlow = findFinishingBlows(events).some(
      (blow) => blow.killerId === characterId,
    );

    if (!hasFinishingBlow) return null;

    const weaponItemId = getHeroMainWeaponItemId();

    if (!weaponItemId) return null;

    return {
      accountId,
      characterId,
      world: game.world,
      weaponItemId,
      events,
    };
  }

  private warnCaptureOverflow(): void {
    if (this.hasWarnedCaptureOverflow) return;
    this.hasWarnedCaptureOverflow = true;
    console.warn(
      "[BattleEventProcessor] Battle capture exceeded its safety budget; skipping the partial payload.",
    );
  }

  private submitIntents(
    killIntent: KillIntent | null,
    battleIntent: BattleIntent | null,
    weaponKillsIntent: WeaponKillsIntent | null,
  ): void {
    if (weaponKillsIntent) {
      recordWeaponKills(weaponKillsIntent)
        .then(({ itemId, kills }) => setWeaponKills(itemId, kills))
        .catch((error) => {
          console.warn(
            "[BattleEventProcessor] Failed to record weapon kills:",
            error,
          );
        });
    }

    if (killIntent) {
      createKill(killIntent).catch((error) => {
        console.warn("[BattleEventProcessor] Failed to create kill:", error);
      });
    }

    if (battleIntent) {
      createBattle(battleIntent)
        .then(() => {
          showRuntimeMessage(getFixedT("timers")("messages.battleLinkCreated"));
        })
        .catch((error) => {
          if (
            shouldRetryLoggedActionStatus(
              getErrorStatusCode(error),
              GAME_EVENT_RETRY_OPTIONS,
            )
          ) {
            releaseBattleSubmission(battleIntent.submissionId);
          }

          console.warn(
            "[BattleEventProcessor] Failed to create battle:",
            error,
          );
        });
    }
  }
}

import { createSHA256Hash } from "@/helpers/create-sha-256-hash";
import { normalizeNpcIcon } from "@lootlog/domain/npc-icon";
import { mapBattleEventsToPayload } from "@/helpers/mappers/battlelog.mappers";
import { LOOTLOG_APP_URL } from "@/config/app";
import { getNpcTypeByWt } from "@lootlog/domain/npc-type";
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
import { createKill, createBattle, recordWeaponKills } from "@/api";
import { findFinishingBlows } from "@lootlog/battle-processor";
import { getHeroMainWeaponItemId } from "@/lib/margonem-runtime/adapters/item-tip-runtime-adapter";
import { setWeaponKills } from "@/lib/margonem-tooltips/weapon-kills";
import { requestMargonemAccountProof } from "@/lib/margonem-account-proof";
import { toast } from "sonner";
import { getFixedT } from "@/i18n/get-fixed-t";
import {
  getErrorStatusCode,
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
  NpcType.COLOSSUS,
  NpcType.TITAN,
]);

type BattleStoreState = ReturnType<typeof useBattleStore.getState>;

type BattleCapture = ReturnType<BattleStoreState["getCaptureSnapshot"]>;

type BattleData = NonNullable<GameEvent["f"]>;

type KillIntent = Parameters<typeof createKill>[0];

type BattleIntent = Parameters<typeof createBattle>[0];

type BattleEvents = BattleIntent["events"];

type WeaponKillsIntent = Omit<
  Parameters<typeof recordWeaponKills>[0],
  "margonemAccountProof"
>;

type KillResolution = {
  intent: KillIntent | null;
  lastKillHash: string | undefined;
};

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
      icon: warrior.mapNpc?.icon ?? normalizeNpcIcon(warrior.icon),
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

/**
 * A player who dies in a group battle may close it while the others fight on.
 * Margonem then sends `close` and never `endBattle`, so the capture so far is
 * submitted as an unfinished battle. A `close` that arrives with `init` belongs
 * to a battle that is already over.
 */
const getBattleEnding = (
  battleData: BattleData,
  startsBattle: boolean,
): "ended" | "left" | null => {
  if (battleData.endBattle === 1) return "ended";

  return battleData.close !== undefined && !startsBattle ? "left" : null;
};

export class BattleEventProcessor {
  private observedTeams = new Set<number>();
  private hasMultipleTeams = false;
  // NPC battles are never submitted, so their packets are not worth capturing.
  private hasNpcWarrior = false;
  private hasWarnedCaptureOverflow = false;
  private battleGeneration = 0;
  // Names the battle to the weapon kill counters, so a repeated battle with
  // the same rows is not taken for a resubmission.
  private battleKey = "";

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

    const ending =
      battleState === "in-battle"
        ? getBattleEnding(event.f, startsBattle)
        : null;

    // PvP battles are captured whether or not the player saves them: the
    // weapon kill counters are read from the same log.
    if (battleState === "in-battle" && !this.hasNpcWarrior) {
      battleStore.addEvent(event);
    }

    if (!ending) {
      battleStore.applyBatch({
        battleState: startsBattle ? "in-battle" : undefined,
        battleWarriors: startsBattle || event.f.w ? battleWarriors : undefined,
      });

      return;
    }

    const endingGeneration = this.battleGeneration;

    const capture = battleStore.getCaptureSnapshot();

    const game = ingress?.game ?? useGameStore.getState().game;
    const hasMultipleTeams = this.hasMultipleTeams;

    battleStore.clearEvents();
    battleStore.applyBatch({ battleState: "idle", battleWarriors });

    const { deadNpcs, hasNpcInBattle, topNpc } =
      getNpcBattleSummary(battleWarriors);

    const pvpEvents = this.getPvpBattleEvents({
      capture,
      hasNpcInBattle,
      hasMultipleTeams,
    });

    const weaponKillsIntent = this.resolveWeaponKillsIntent(pvpEvents, game);

    const [killResult, battleIntent] = await Promise.all([
      // The NPCs of a battle that goes on without the player may still die.
      this.resolveKillIntent({
        deadNpcs,
        hasNpcInBattle,
        game,
        lastKillHash: stateAtIngress.lastKillHash,
        topNpc: ending === "ended" ? topNpc : null,
      }),
      this.resolveBattleIntent({
        events: battlePanelStore.isBattleCollectionEnabled ? pvpEvents : null,
        turns: capture.turns,
        game,
      }),
    ]);

    if (endingGeneration === this.battleGeneration) {
      battleStore.applyBatch({ lastKillHash: killResult.lastKillHash });
    }

    this.submitIntents(
      killResult.intent,
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
    this.battleGeneration += 1;
    this.battleKey = crypto.randomUUID();
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
      // Release what was captured before the NPC joined; the battle can no
      // longer produce a submission.
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

  private resolveKillIntent(params: {
    deadNpcs: DeadNpc[];
    hasNpcInBattle: boolean;
    game: RuntimeGameSnapshot | null;
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
      game: RuntimeGameSnapshot | null;
      lastKillHash: string | undefined;
      topNpc: DeadNpc | null;
    },
    killHash: string,
  ): KillResolution {
    if (killHash === params.lastKillHash) {
      return { intent: null, lastKillHash: params.lastKillHash };
    }

    const game = params.game;

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
        character: {
          name: game.hero.name,
          lvl: game.hero.level,
          prof: game.hero.profession,
          icon: game.hero.icon,
        },
      },
      lastKillHash: killHash,
    };
  }

  /** The submittable events of a finished multi-team battle without NPCs. */
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

  /**
   * The server credits the hero's finishing blows itself; the client sends
   * the log only when it contains one, together with the weapon the hero
   * wore. Equipment cannot change during a battle.
   */
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
      battleKey: this.battleKey,
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
      // Margonem signs that this account plays the character, for this battle.
      requestMargonemAccountProof({
        bindingId: weaponKillsIntent.battleKey,
        accountId: weaponKillsIntent.accountId,
        characterId: weaponKillsIntent.characterId,
      })
        .then((margonemAccountProof) =>
          recordWeaponKills({ ...weaponKillsIntent, margonemAccountProof }),
        )
        .then(({ itemId, kills }) => {
          setWeaponKills(
            weaponKillsIntent.world,
            weaponKillsIntent.characterId,
            itemId,
            kills,
          );
        })
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
        .then((response) => {
          showBattleCreatedToast(response.battleId);
        })
        .catch((error) => {
          // A battle that never reached the server may be sent by a repeat.
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

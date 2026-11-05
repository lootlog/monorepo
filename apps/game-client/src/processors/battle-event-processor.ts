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

const getNpcBattleSummary = (warriors: BattleWarriorsWithAccountId) => {
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
      // A battle reports no template flags; the map observation keeps it.
      isHeroFromEvent: warrior.mapNpc?.isHeroFromEvent,
    };

    if (!topNpc || deadNpc.wt > topNpc.wt) {
      topNpc = deadNpc;
    }
  }

  return {
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

  async handle(
    event: GameEvent,
    ingress?: RuntimeIngressSnapshot,
  ): Promise<void> {
    if (!event.f) return;

    const battlePanelStore = useBattlePanelStore.getState();
    // The state before this packet; its actions still write the live store.
    const battleStore = useBattleStore.getState();
    const startsBattle = event.f.init === "1";

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

    const capture = battleStore.getCaptureSnapshot();

    const game = ingress?.game ?? useGameStore.getState().game;
    const hasMultipleTeams = this.hasMultipleTeams;

    battleStore.clearEvents();
    battleStore.applyBatch({ battleState: "idle", battleWarriors });

    const { hasNpcInBattle, topNpc } = getNpcBattleSummary(battleWarriors);

    const pvpEvents = this.getPvpBattleEvents({
      capture,
      hasNpcInBattle,
      hasMultipleTeams,
    });

    const weaponKillsIntent = this.resolveWeaponKillsIntent(pvpEvents, game);

    // The API deduplicates kills reported by every player of the battle.
    const killIntent = this.resolveKillIntent(
      // A battle the player left goes on, so its NPCs may still survive.
      ending === "ended" ? topNpc : null,
      game,
    );

    const battleIntent = await this.resolveBattleIntent({
      events: battlePanelStore.isBattleCollectionEnabled ? pvpEvents : null,
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

  private resolveKillIntent(
    topNpc: DeadNpc | null,
    game: RuntimeGameSnapshot | null,
  ): KillIntent | null {
    if (!topNpc || !game) return null;

    if (!TRACKABLE_NPC_TYPES.has(getNpcType(NpcType, topNpc))) return null;

    const { type: _, ...npcWithoutType } = topNpc;

    return {
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

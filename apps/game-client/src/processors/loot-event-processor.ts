import {
  createLootDebugContext,
  logLootCreateDebug,
  type LootCreateDebugContext,
} from "@/lib/loot-create-debug";
import { getLoot } from "@/utils/game/get-loots";
import {
  getBattleParticipants,
  type Npc,
  type PartyMember,
} from "@/utils/game/get-battle-participants";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { createLoot } from "@/api";
import { useBattleStore } from "@/store/game-store/battle.store";
import { isEmpty } from "@/utils/object-utils";
import { useLootStore } from "@/store/game-store/loot.store";
import {
  useDialogStore,
  type DialogNpcContextSource,
} from "@/store/game-store/dialog.store";
import { reportLootSkipped } from "@/lib/error-monitoring";
import { useNpcsStore } from "@/store/npcs.store";
import type {
  RuntimeGameSnapshot,
  RuntimeIngressSnapshot,
  RuntimeNpc,
} from "@/lib/margonem-runtime/runtime.types";
import { useGameStore } from "@/store/game.store";
import { EffectReplayGuard } from "./effect-replay-guard";

export class LootEventProcessor {
  private readonly effectReplayGuard = new EffectReplayGuard();

  handleLootFromBattle(
    event: GameEvent,
    ingress?: RuntimeIngressSnapshot,
  ): void {
    if (!event.item || event.loot?.source !== "fight") return;

    const debugContext = createLootDebugContext("fight");
    const battleStore = useBattleStore.getState();
    const lootStore = useLootStore.getState();
    const game = ingress?.game ?? useGameStore.getState().game;

    logLootCreateDebug("event-detected", {
      ...debugContext,
      battleWarriors: battleStore.battleWarriors,
      event,
    });

    if (isEmpty(battleStore.battleWarriors)) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "missing-battle-warriors",
      });
      reportLootSkipped({
        ...debugContext,
        battleWarriorCount: Object.keys(battleStore.battleWarriors).length,
        hasFightData: Boolean(event.f),
        mapName: game?.map.name ?? "unknown",
        reason: "missing-battle-warriors",
        world: game?.world ?? "unknown",
      });
      return;
    }

    const previousLastLootId = lootStore.lastLootId;
    lootStore.setLastLootId(null);
    if (!game) {
      reportLootSkipped({
        ...debugContext,
        mapName: "unknown",
        reason: "missing-runtime-game-snapshot",
        world: "unknown",
      });
      return;
    }
    this.createLootFromBattle(event, debugContext, game, previousLastLootId);
  }

  handleDialogLoot(event: GameEvent, ingress?: RuntimeIngressSnapshot): void {
    if (!event.item || event.loot?.source !== "dialog") return;

    const debugContext = createLootDebugContext("dialog");
    const dialogStore = useDialogStore.getState();
    const game = ingress?.game ?? useGameStore.getState().game;
    const eventNpcDelIds = (event.npcs_del ?? []).map((npc) => npc.id);
    logLootCreateDebug("event-detected", {
      ...debugContext,
      dialogNpcContext: dialogStore.npcContext,
      event,
      eventNpcDelIds,
    });
    if (!dialogStore.npcContext) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        eventNpcDelIds,
        reason: "missing-dialog-npc-context",
      });
      reportLootSkipped({
        ...debugContext,
        eventNpcDelIds,
        mapName: game?.map.name ?? "unknown",
        reason: "missing-dialog-npc-context",
        requestedNpcIds: eventNpcDelIds,
        world: game?.world ?? "unknown",
      });
      return;
    }

    const lootStore = useLootStore.getState();
    const previousLastLootId = lootStore.lastLootId;
    lootStore.setLastLootId(null);

    const { npcContext } = dialogStore;
    const npc =
      npcContext.npc ?? useNpcsStore.getState().getNpc(npcContext.npcId);
    const resolutionSource: DialogNpcContextSource = npcContext.npc
      ? npcContext.source
      : "fallback-lookup";

    if (!npc || isEmpty(npc)) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        eventNpcDelIds,
        npcId: npcContext.npcId,
        reason: "missing-dialog-npc-snapshot",
        resolutionSource,
      });
      reportLootSkipped({
        ...debugContext,
        eventNpcDelIds,
        mapName: game?.map.name ?? "unknown",
        reason: "missing-dialog-npc-snapshot",
        requestedNpcIds: [npcContext.npcId],
        resolvedNpcCount: 0,
        world: game?.world ?? "unknown",
      });
      return;
    }

    if (!game) {
      reportLootSkipped({
        ...debugContext,
        mapName: "unknown",
        reason: "missing-runtime-game-snapshot",
        world: "unknown",
      });
      return;
    }
    this.createLootFromDialog(
      event,
      debugContext,
      npc,
      resolutionSource,
      game,
      previousLastLootId,
    );
  }

  private createLootFromBattle(
    event: GameEvent,
    debugContext: LootCreateDebugContext,
    game: RuntimeGameSnapshot,
    previousLastLootId: number | null,
  ): void {
    const loot = event.loot;
    if (!loot) return;
    if (!event.f) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "missing-fight-data",
      });
      reportLootSkipped({
        ...debugContext,
        battleWarriorCount: Object.keys(
          useBattleStore.getState().battleWarriors,
        ).length,
        hasFightData: false,
        mapName: game.map.name,
        reason: "missing-fight-data",
        world: game.world,
      });
      return;
    }

    const loots = getLoot(event.item, loot);
    if (!loots.length) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "empty-parsed-loots",
      });
      reportLootSkipped({
        ...debugContext,
        battleWarriorCount: Object.keys(
          useBattleStore.getState().battleWarriors,
        ).length,
        hasFightData: true,
        mapName: game.map.name,
        parsedLootCount: 0,
        reason: "empty-parsed-loots",
        world: game.world,
      });
      return;
    }

    const battleStore = useBattleStore.getState();
    const { npcs, party } = getBattleParticipants(
      battleStore.battleWarriors,
      game,
    );
    const { hero, map } = game;

    const payload = {
      world: game.world,
      source: loot.source.toUpperCase(),
      location: map.name,
      npcs,
      loots,
      players: party,
      accountId: hero.accountId,
      characterId: hero.characterId,
    };

    logLootCreateDebug("request-prepared", {
      ...debugContext,
      payload,
    });

    const effectKey = JSON.stringify(payload);
    if (!this.effectReplayGuard.reserve(effectKey)) {
      useLootStore.getState().setLastLootId(previousLastLootId);
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "duplicate-loot-effect",
      });
      return;
    }

    createLoot(payload, debugContext)
      .then((response) => {
        useLootStore.getState().setLastLootId(response.id);
        logLootCreateDebug("completed", {
          ...debugContext,
          lastLootId: response.id,
          response,
        });
      })
      .catch((error) => {
        this.effectReplayGuard.forget(effectKey);
        logLootCreateDebug("failed", {
          ...debugContext,
          error,
        });
        console.warn("[LootEventProcessor] Failed to create loot:", error);
      });
  }

  private createLootFromDialog(
    event: GameEvent,
    debugContext: LootCreateDebugContext,
    npcData: RuntimeNpc,
    resolutionSource: DialogNpcContextSource,
    game: RuntimeGameSnapshot,
    previousLastLootId: number | null,
  ): void {
    const loot = event.loot;
    if (!loot) return;

    const loots = getLoot(event.item, loot);
    if (!loots.length) {
      const requestedNpcIds = (event.npcs_del ?? []).map((npc) => npc.id);
      logLootCreateDebug("skipped", {
        ...debugContext,
        eventNpcDelIds: requestedNpcIds,
        npcId: npcData.id,
        reason: "empty-parsed-loots",
        resolutionSource,
      });
      reportLootSkipped({
        ...debugContext,
        eventNpcDelIds: requestedNpcIds,
        mapName: game.map.name,
        parsedLootCount: 0,
        reason: "empty-parsed-loots",
        requestedNpcIds,
        world: game.world,
      });
      return;
    }

    const mapName = game.map.name;
    const npcs: Npc[] = [
      {
        icon: npcData.icon,
        id: npcData.id,
        name: npcData.name,
        prof: npcData.profession,
        hpp: 0,
        type: npcData.type,
        wt: npcData.weight,
        lvl: npcData.level,
        location: mapName,
      },
    ];

    const { hero } = game;
    const players: PartyMember[] = [
      {
        id: Number(hero.characterId),
        name: hero.name,
        icon: hero.icon,
        prof: hero.profession,
        hpp: Math.floor((hero.currentHp / hero.maxHp) * 100),
        lvl: hero.level,
        accountId: Number(hero.accountId),
      },
    ];

    const payload = {
      world: game.world,
      source: loot.source.toUpperCase(),
      location: mapName,
      loots,
      npcs,
      players,
      accountId: hero.accountId,
      characterId: hero.characterId,
    };

    logLootCreateDebug("request-prepared", {
      ...debugContext,
      eventNpcDelIds: (event.npcs_del ?? []).map((npc) => npc.id),
      payload,
      resolutionSource,
    });

    const effectKey = JSON.stringify(payload);
    if (!this.effectReplayGuard.reserve(effectKey)) {
      useLootStore.getState().setLastLootId(previousLastLootId);
      useDialogStore.getState().clearNpcContext();
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "duplicate-loot-effect",
        resolutionSource,
      });
      return;
    }

    useDialogStore.getState().clearNpcContext();
    createLoot(payload, debugContext)
      .then((response) => {
        useLootStore.getState().setLastLootId(response.id);
        logLootCreateDebug("completed", {
          ...debugContext,
          lastLootId: response.id,
          response,
        });
      })
      .catch((error) => {
        this.effectReplayGuard.forget(effectKey);
        logLootCreateDebug("failed", {
          ...debugContext,
          error,
        });
        console.warn(
          "[LootEventProcessor] Failed to create dialog loot:",
          error,
        );
      });
  }
}

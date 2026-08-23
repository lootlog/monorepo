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
import { useNpcsStore } from "@/store/npcs.store";
import type {
  RuntimeGameSnapshot,
  RuntimeIngressSnapshot,
  RuntimeNpc,
} from "@/lib/margonem-runtime/runtime.types";
import { useGameStore } from "@/store/game.store";
import { resolveDialogLootNpcLevel } from "@/utils/game/resolve-dialog-loot-npc-level";

export class LootEventProcessor {
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
      return;
    }

    lootStore.setLastLootId(null);
    if (!game) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "missing-runtime-game-snapshot",
      });
      return;
    }
    this.createLootFromBattle(event, debugContext, game);
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
      return;
    }

    const lootStore = useLootStore.getState();
    lootStore.setLastLootId(null);

    const { npcContext } = dialogStore;
    const npc =
      npcContext.npc ??
      ingress?.npcsById[npcContext.npcId] ??
      useNpcsStore.getState().getNpc(npcContext.npcId);
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
      return;
    }

    if (!game) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "missing-runtime-game-snapshot",
      });
      return;
    }
    this.createLootFromDialog(event, debugContext, npc, resolutionSource, game);
  }

  private createLootFromBattle(
    event: GameEvent,
    debugContext: LootCreateDebugContext,
    game: RuntimeGameSnapshot,
  ): void {
    const loot = event.loot;
    if (!loot) return;
    if (!event.f) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "missing-fight-data",
      });
      return;
    }

    const loots = getLoot(event.item, loot);
    if (!loots.length) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "empty-parsed-loots",
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
        lvl: resolveDialogLootNpcLevel({
          npcName: npcData.name,
          npcLevel: npcData.level,
        }),
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

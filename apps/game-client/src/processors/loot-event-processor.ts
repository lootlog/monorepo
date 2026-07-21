import { Game } from "@/lib/game";
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
import { useDialogStore } from "@/store/game-store/dialog.store";
import { reportLootSkipped } from "@/lib/error-monitoring";

export class LootEventProcessor {
  handleLootFromBattle(event: GameEvent): void {
    if (!event.item || event.loot?.source !== "fight") return;

    const debugContext = createLootDebugContext("fight");
    const battleStore = useBattleStore.getState();
    const lootStore = useLootStore.getState();

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
        mapName: Game.map.name,
        reason: "missing-battle-warriors",
        world: Game.getWorldName(),
      });
      return;
    }

    lootStore.setLastLootId(null);
    this.createLootFromBattle(event, debugContext);
  }

  handleDialogLoot(event: GameEvent): void {
    if (!event.item || event.loot?.source !== "dialog") return;

    const debugContext = createLootDebugContext("dialog");
    const dialogStore = useDialogStore.getState();
    logLootCreateDebug("event-detected", {
      ...debugContext,
      event,
      talkingNpcId: dialogStore.talkingNpcId,
    });
    if (!dialogStore.talkingNpcId) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "missing-talking-npc-id",
      });
      reportLootSkipped({
        ...debugContext,
        mapName: Game.map.name,
        reason: "missing-talking-npc-id",
        world: Game.getWorldName(),
      });
      return;
    }

    const lootStore = useLootStore.getState();
    lootStore.setLastLootId(null);

    if (event.npcs_del?.length) {
      this.createLootFromDialog(event, debugContext);
    } else if (dialogStore.talkingNpcId) {
      const npc = Game.getNpc(+dialogStore.talkingNpcId);
      if (npc) {
        this.createLootFromDialog(
          { ...event, npcs_del: [{ id: npc.id }] },
          debugContext,
        );
      } else {
        logLootCreateDebug("skipped", {
          ...debugContext,
          npcId: dialogStore.talkingNpcId,
          reason: "missing-fallback-npc",
        });
        reportLootSkipped({
          ...debugContext,
          mapName: Game.map.name,
          reason: "missing-fallback-npc",
          requestedNpcIds: [+dialogStore.talkingNpcId],
          resolvedNpcCount: 0,
          world: Game.getWorldName(),
        });
      }
    }
  }

  private createLootFromBattle(
    event: GameEvent,
    debugContext: LootCreateDebugContext,
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
        mapName: Game.map.name,
        reason: "missing-fight-data",
        world: Game.getWorldName(),
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
        mapName: Game.map.name,
        parsedLootCount: 0,
        reason: "empty-parsed-loots",
        world: Game.getWorldName(),
      });
      return;
    }

    const battleStore = useBattleStore.getState();
    const { npcs, party } = getBattleParticipants(battleStore.battleWarriors);
    const hero = Game.hero;
    const map = Game.map;

    const payload = {
      world: Game.getWorldName(),
      source: loot.source.toUpperCase(),
      location: map.name,
      npcs,
      loots,
      players: party,
      accountId: String(hero.account),
      characterId: String(hero.id),
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
  ): void {
    const loot = event.loot;
    if (!loot) return;

    const loots = getLoot(event.item, loot);
    if (!loots.length) {
      const requestedNpcIds = (event.npcs_del ?? []).map((npc) => npc.id);
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "empty-parsed-loots",
      });
      reportLootSkipped({
        ...debugContext,
        mapName: Game.map.name,
        parsedLootCount: 0,
        reason: "empty-parsed-loots",
        requestedNpcIds,
        world: Game.getWorldName(),
      });
      return;
    }

    const mapName = Game.map.name;
    const npcs: Npc[] = [];

    for (const npc of event.npcs_del ?? []) {
      const npcData = Game.getNpc(npc.id);

      if (!npcData || isEmpty(npcData)) {
        continue;
      }

      npcs.push({
        icon: npcData.icon,
        id: npcData.id,
        name: npcData.nick,
        prof: npcData.prof,
        hpp: 0,
        type: npcData.type,
        wt: npcData.wt,
        lvl: npcData.lvl,
        location: mapName,
      });
    }

    if (npcs.length === 0) {
      const requestedNpcIds = (event.npcs_del ?? []).map((npc) => npc.id);
      logLootCreateDebug("skipped", {
        ...debugContext,
        npcIds: requestedNpcIds,
        reason: "unresolved-dialog-npcs",
      });
      reportLootSkipped({
        ...debugContext,
        mapName,
        reason: "unresolved-dialog-npcs",
        requestedNpcIds,
        resolvedNpcCount: 0,
        world: Game.getWorldName(),
      });
      return;
    }

    const hero = Game.hero;
    const players: PartyMember[] = [
      {
        id: hero.id,
        name: hero.nick,
        icon: hero.img,
        prof: hero.prof,
        hpp: Math.floor(
          (hero.warrior_stats.hp / hero.warrior_stats.maxhp) * 100,
        ),
        lvl: hero.lvl,
        accountId: hero.account,
      },
    ];

    const payload = {
      world: Game.getWorldName(),
      source: loot.source.toUpperCase(),
      location: mapName,
      loots,
      npcs,
      players,
      accountId: String(hero.account),
      characterId: String(hero.id),
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
        console.warn(
          "[LootEventProcessor] Failed to create dialog loot:",
          error,
        );
      });
  }
}

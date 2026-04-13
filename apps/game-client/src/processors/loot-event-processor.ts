import { Game } from "@/lib/game";
import { getLoot } from "@/utils/game/get-loots";
import {
  getBattleParticipants,
  type Npc,
  type PartyMember,
} from "@/utils/game/get-battle-participants";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { createLoot } from "@/services/api.service";
import { useBattleStore } from "@/store/game-store/battle.store";
import { isEmpty } from "@/utils/object-utils";
import { useLootStore } from "@/store/game-store/loot.store";
import { useDialogStore } from "@/store/game-store/dialog.store";

export class LootEventProcessor {
  handleLootFromBattle(event: GameEvent): void {
    if (!event.item || event.loot?.source !== "fight") return;

    const battleStore = useBattleStore.getState();
    const lootStore = useLootStore.getState();

    if (isEmpty(battleStore.battleWarriors)) return;

    lootStore.setLastLootId(null);
    this.createLootFromBattle(event);
  }

  handleDialogLoot(event: GameEvent): void {
    if (!event.item || event.loot?.source !== "dialog") return;

    const dialogStore = useDialogStore.getState();
    if (!dialogStore.talkingNpcId) return;

    const lootStore = useLootStore.getState();
    lootStore.setLastLootId(null);

    if (event.npcs_del?.length) {
      this.createLootFromDialog(event);
    } else if (dialogStore.talkingNpcId) {
      const npc = Game.getNpc(+dialogStore.talkingNpcId);
      if (npc) {
        this.createLootFromDialog({ ...event, npcs_del: [{ id: npc.id }] });
      }
    }
  }

  private createLootFromBattle(event: GameEvent): void {
    const battleStore = useBattleStore.getState();

    const world = Game.getWorldName();
    const accountId = Game.hero.account;
    const characterId = Game.hero.id;

    if (!event.loot || !event.f) return;

    const loots = getLoot(event.item, event.loot);
    if (!loots.length) return;

    const { npcs, party } = getBattleParticipants(battleStore.battleWarriors);

    createLoot({
      world,
      source: event.loot.source.toUpperCase(),
      location: Game.map.name,
      npcs,
      loots,
      players: party,
      accountId: String(accountId),
      characterId: String(characterId),
    })
      .then((response) => {
        useLootStore.getState().setLastLootId(response.id);
      })
      .catch((error) => {
        console.warn("[LootEventProcessor] Failed to create loot:", error);
      });
  }

  private createLootFromDialog(event: GameEvent): void {
    const world = Game.getWorldName();
    const accountId = Game.hero.account;
    const characterId = Game.hero.id;

    if (!event.loot) return;

    const loots = getLoot(event.item, event.loot);
    if (!loots.length) return;

    const npcs: Npc[] =
      event.npcs_del
        ?.map((npc) => Game.getNpc(npc.id))
        .filter(
          (npcData): npcData is NonNullable<typeof npcData> =>
            !isEmpty(npcData),
        )
        .map((npcData) => ({
          icon: npcData.icon,
          id: npcData.id,
          name: npcData.nick,
          prof: npcData.prof,
          hpp: 0,
          type: npcData.type,
          wt: npcData.wt,
          lvl: npcData.lvl,
          location: Game.map.name,
        })) ?? [];

    if (npcs.length === 0) return;

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

    createLoot({
      world,
      source: event.loot.source.toUpperCase(),
      location: Game.map.name,
      loots,
      npcs,
      players,
      accountId: String(accountId),
      characterId: String(characterId),
    })
      .then((response) => {
        useLootStore.getState().setLastLootId(response.id);
      })
      .catch((error) => {
        console.warn(
          "[LootEventProcessor] Failed to create dialog loot:",
          error,
        );
      });
  }
}

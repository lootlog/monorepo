import type { AxiosResponse } from "axios";
import { Game } from "@/lib/game";
import { getLoot } from "@/utils/game/get-loots";
import {
  getBattleParticipants,
  type Npc,
  type PartyMember,
} from "@/utils/game/get-battle-participants";
import type { GameEvent } from "@/types/margonem/game-events/game-event";
import {
  type CreateLootResponse,
  useCreateLoot,
} from "@/hooks/api/use-create-loot";
import { useBattleStore } from "@/store/game-store/battle.store";
import { isEmpty } from "@/utils/object-utils";
import { useLootStore } from "@/store/game-store/loot.store";
import { useDialogStore } from "@/store/game-store/dialog.store";

export const useLootHandlers = () => {
  const { mutate: createLoot } = useCreateLoot();

  const handleLootFromBattle = (event: GameEvent) => {
    if (!event.item || event.loot?.source !== "fight") return;

    const battleStore = useBattleStore.getState();
    const lootStore = useLootStore.getState();

    if (isEmpty(battleStore.battleWarriors)) return;

    lootStore.setLastLootId(null);
    createLootFromBattle(event);
  };

  const handleDialogLoot = (event: GameEvent) => {
    if (!event.item || event.loot?.source !== "dialog") return;

    const dialogStore = useDialogStore.getState();
    if (!dialogStore.talkingNpcId) return;

    const lootStore = useLootStore.getState();

    lootStore.setLastLootId(null);

    if (event.npcs_del?.length) {
      createLootFromDialog(event);
    } else if (dialogStore.talkingNpcId) {
      const npc = Game.getNpc(+dialogStore.talkingNpcId);
      if (npc) {
        createLootFromDialog({ ...event, npcs_del: [{ id: npc.id }] });
      }
    }
  };

  const createLootFromBattle = (event: GameEvent) => {
    const battleStore = useBattleStore.getState();
    const lootStore = useLootStore.getState();

    const world = Game.getWorldName();
    const accountId = Game.hero.account;
    const characterId = Game.hero.id;

    const loots = getLoot(event.item, event.loot!);
    if (!loots.length || !event.loot || !event.f) return;

    const { npcs, party } = getBattleParticipants(battleStore.battleWarriors);

    createLoot(
      {
        world,
        source: event.loot.source.toUpperCase(),
        location: Game.map.name,
        npcs,
        loots,
        players: party,
        accountId: String(accountId),
        characterId: String(characterId),
      },
      {
        onSuccess: (response: AxiosResponse<CreateLootResponse>) => {
          lootStore.setLastLootId(response.data.id);
        },
      },
    );
  };

  const createLootFromDialog = (event: GameEvent) => {
    const world = Game.getWorldName();
    const accountId = Game.hero.account;
    const characterId = Game.hero.id;
    const lootStore = useLootStore.getState();

    const loots = getLoot(event.item, event.loot!);
    if (!loots.length || !event.loot) return;

    const npcs: Npc[] =
      event.npcs_del
        ?.map((npc) => Game.getNpc(npc.id))
        .filter(
          (npcData): npcData is NonNullable<typeof npcData> =>
            npcData !== null && npcData !== undefined && !isEmpty(npcData),
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

    createLoot(
      {
        world,
        source: event.loot.source.toUpperCase(),
        location: Game.map.name,
        loots,
        npcs,
        players,
        accountId: String(accountId),
        characterId: String(characterId),
      },
      {
        onSuccess: (response: AxiosResponse<CreateLootResponse>) => {
          lootStore.setLastLootId(response.data.id);
        },
      },
    );
  };

  return {
    createLootFromBattle,
    createLootFromDialog,
    handleLootFromBattle,
    handleDialogLoot,
  };
};

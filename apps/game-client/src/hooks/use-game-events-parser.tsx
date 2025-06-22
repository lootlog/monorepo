import { useCreateLoot } from "@/hooks/api/use-create-loot";
import { useCreateTimer } from "@/hooks/api/use-create-timer";
import { Game } from "@/lib/game";
import { useGlobalStore } from "@/store/global.store";
import {
  GameNpcWithLocation,
  PickedNpcType,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import { W } from "@/types/margonem/game-events/f";
import { GameEvent } from "@/types/margonem/game-events/game-event";
import { GameNpc } from "@/types/margonem/npcs";
import { getNpcIconFromEvent } from "@/utils/game/events/get-npc-icon-from-event";
import { getNpcTplFromEvent } from "@/utils/game/events/get-npc-tpl-from-event";
import { getBattleParticipants } from "@/utils/game/get-battle-participants";
import { getLoot } from "@/utils/game/get-loots";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";
import { useEffect, useRef, useState } from "react";

export const useGameEventsParser = () => {
  const { gameInitialized, gameInterface, characterId, accountId, world } =
    useGlobalStore((s) => s.gameState);
  const [initialized, setInitialized] = useState(false);
  const { setOpen } = useWindowsStore();
  const { addNpc, removeNpc } = useNpcDetectorStore();
  const pendingBattle = useRef<W | null>(null);
  const talkingNpcId = useRef<string | null>(null);
  const isNI = gameInterface === "ni";
  const { mutate: createLoot } = useCreateLoot();
  const { mutate: createTimer } = useCreateTimer();
  const { settings } = useNpcDetectorStore();
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const setupGameEventsHandler = () => {
    const wrap =
      (original: Function, handler: Function) => (response: string) => {
        const parsed = JSON.parse(response);
        handler(parsed);
        original(response);
      };

    if (isNI) {
      window.Engine.communication.ogSuccessData =
        window.Engine.communication.successData.bind(
          window.Engine.communication
        );
      window.Engine.communication.successData = wrap(
        window.Engine.communication.ogSuccessData,
        handleEvent
      );
    } else {
      window.ogSuccessData = window.successData.bind(window);
      window.successData = wrap(window.ogSuccessData, handleEvent);
    }

    setInitialized(true);
  };

  const removeGameEventsHandler = () => {
    if (isNI && window.Engine.communication.ogSuccessData) {
      window.Engine.communication.successData =
        window.Engine.communication.ogSuccessData;
      window.Engine.communication.ogSuccessData = null;
    } else if (!isNI && window.ogSuccessData) {
      window.successData = window.ogSuccessData;
      window.ogSuccessData = null;
    }
  };

  const handleNpcDetection = (event: GameEvent) => {
    if (event.f?.init === "1" || !characterId) return;
    console.log("handleNpcDetection", event);

    const npcs =
      event.npcs?.reduce<GameNpcWithLocation[]>((acc, npc) => {
        const tpl =
          getNpcTplFromEvent(event, npc.tpl) || Game.getNpcTpl(npc.tpl);
        if (!tpl) return acc;

        const npcType = getNpcTypeByWt(tpl.wt);
        const settings =
          settingsRef.current[characterId][npcType as PickedNpcType];
        const isNpcTypeDetected = settings?.detect ?? false;

        if (!isNpcTypeDetected) return acc;

        const icon =
          getNpcIconFromEvent(event, npc.icon.id) ||
          Game.getNpcIcon(npc.icon.id);

        acc.push({
          ...npc,
          icon: icon || "",
          nick: tpl.nick,
          prof: tpl.prof,
          wt: tpl.wt,
          lvl: tpl.lvl,
          type: tpl.type,
          location: Game.map.name,
        });
        return acc;
      }, []) ?? [];

    if (npcs.length > 0) {
      setOpen("npc-detector", true);
      addNpc(npcs);
    }
  };

  const createLootFromBattle = (event: GameEvent) => {
    const loots = getLoot(event.item);
    if (
      !loots.length ||
      !world ||
      !accountId ||
      !characterId ||
      !event.loot ||
      !event.f
    )
      return;

    const { npcs, party } = getBattleParticipants(
      pendingBattle.current,
      event.f.w
    );

    createLoot({
      world,
      source: event.loot.source.toUpperCase(),
      location: Game.map.name,
      npcs,
      loots,
      players: party,
      accountId,
      characterId,
    });
  };

  const createLootFromDialog = (event: GameEvent) => {
    const loots = getLoot(event.item);
    if (!loots.length || !world || !event.loot || !accountId || !characterId)
      return;

    const npcs =
      event.npcs_del
        ?.map((npc) => Game.getNpc(npc.id))
        .filter((e) => !!e)
        .map((npcData) => ({
          icon: npcData.icon,
          id: npcData.id,
          prof: npcData.prof,
          hpp: 0,
          type: npcData.type,
          wt: npcData.wt,
          lvl: npcData.lvl,
          name: npcData.nick,
          location: Game.map.name,
        })) ?? [];

    const hero = Game.hero;
    const players = [
      {
        id: hero.id,
        name: hero.nick,
        icon: hero.img,
        prof: hero.prof,
        hpp: Math.floor(
          (hero.warrior_stats.hp / hero.warrior_stats.maxhp) * 100
        ),
        lvl: hero.lvl,
        accountId: hero.account,
      },
    ];

    if (npcs.length > 0) {
      createLoot({
        world,
        source: event.loot.source.toUpperCase(),
        location: Game.map.name,
        loots,
        npcs,
        players,
        accountId,
        characterId,
      });
    }
  };

  const handleRespawnTimers = (event: GameEvent) => {
    if (!world || !characterId || !accountId) return;

    event.npcs_del?.forEach((npc) => {
      const data = Game.getNpc(npc.id);

      if (!data) return;

      if (!npc.respBaseSeconds || npc.respBaseSeconds < 2) return;
      removeNpc(npc.id);

      createTimer({
        respawnRandomness: data.resp_rand,
        respBaseSeconds: npc.respBaseSeconds,
        characterId,
        accountId,
        world,
        npc: {
          icon: data.icon,
          id: data.id,
          prof: data.prof,
          wt: data.wt,
          hpp: 0,
          type: data.type,
          lvl: data.lvl,
          name: data.nick,
          location: Game.map.name,
        },
      });
    });
  };

  const handleInitialNpcsDetection = () => {
    if (!characterId) return;

    const npcs = Game.npcs;
    const calculatedNpcs =
      npcs?.reduce<GameNpcWithLocation[]>((acc, npc) => {
        if (!npc) return acc;

        const npcType = getNpcTypeByWt(npc.wt);

        const settings =
          settingsRef.current[characterId][npcType as PickedNpcType];
        const isNpcTypeDetected = settings?.detect ?? false;

        if (!isNpcTypeDetected) return acc;

        acc.push({
          ...npc,
          icon: npc.icon || "",
          nick: npc.nick,
          prof: npc.prof,
          wt: npc.wt,
          lvl: npc.lvl,
          type: npc.type,
          location: Game.map.name,
        });
        return acc;
      }, []) ?? [];

    if (calculatedNpcs.length > 0) {
      setOpen("npc-detector", true);
      addNpc(calculatedNpcs);
    }
  };

  const handleEvent = (event: GameEvent) => {
    if (!world || !characterId || !accountId || Object.keys(event).length <= 2)
      return;

    if (event.d?.[2]) talkingNpcId.current = event.d[2];
    if (event.f?.w && event.f.init === "1") pendingBattle.current = event.f.w;
    if (event.npcs) handleNpcDetection(event);

    if (
      event.f?.endBattle === 1 &&
      event.item &&
      event.loot?.source === "fight"
    ) {
      createLootFromBattle(event);
    }

    if (event.item && event.loot?.source === "dialog") {
      if (event.npcs_del?.length) createLootFromDialog(event);
      else if (talkingNpcId.current) {
        const npc = Game.getNpc(+talkingNpcId.current);
        if (npc) {
          createLootFromDialog({ ...event, npcs_del: [{ id: npc.id }] });
        }
      }
    }

    if (event.npcs_del?.length) handleRespawnTimers(event);
  };

  useEffect(() => {
    if (!gameInitialized || initialized) return;
    setupGameEventsHandler();
    handleInitialNpcsDetection();
    return () => removeGameEventsHandler();
  }, [gameInitialized]);
};

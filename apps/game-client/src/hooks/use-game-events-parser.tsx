import { useGlobalContext } from "@/contexts/global-context";
import { useCreateLoot } from "@/hooks/api/useCreateLoot";
import { useCreateTimer } from "@/hooks/api/useCreateTimer";
import { W } from "@/types/margonem/game-events/f";
import { GameEvent } from "@/types/margonem/game-events/game-event";
import { HeroD } from "@/types/margonem/hero";
import { checkIfNpcIsWithinRange } from "@/utils/game/check-if-npc-within-range";
import {
  getBattleParticipants,
  KilledNpc,
} from "@/utils/game/get-battle-participants";
import { getLoot } from "@/utils/game/get-loots";
import { useEffect, useRef, useState } from "react";

export const useGameEventsParser = () => {
  const { initialized, newInterface } = useGlobalContext();
  const [gameEventsParserInitialized, setGameEventsParserInitialized] =
    useState(false);
  const pendingBattle = useRef<W | null>(null);
  const talkingNpcId = useRef<string | null>(null);

  const { mutate: createLoot } = useCreateLoot();
  const { mutate: createTimer } = useCreateTimer();

  const setupGameEventsHandler = () => {
    console.log("initializing game events handler");

    if (newInterface) {
      window.Engine.communication.ogSuccessData =
        window.Engine.communication.successData.bind(
          window.Engine.communication
        );
      window.Engine.communication.successData = (response) => {
        const parsedEvent = JSON.parse(response);
        handleEvent(parsedEvent);

        window.Engine.communication.ogSuccessData?.(response);
      };
    } else {
      window.ogSuccessData = window.successData.bind(window);
      window.successData = (response) => {
        const parsedEvent = JSON.parse(response);
        handleEvent(parsedEvent);

        window.ogSuccessData?.(response);
      };
    }

    setGameEventsParserInitialized(true);
  };

  const removeGameEventsHandler = () => {
    if (newInterface) {
      if (!window.Engine.communication.ogSuccessData) return;

      window.Engine.communication.successData =
        window.Engine.communication.ogSuccessData;
      window.Engine.communication.ogSuccessData = null;
    } else {
      if (!window.ogSuccessData) return;

      window.successData = window.ogSuccessData;
      window.ogSuccessData = null;
    }
  };

  const handleEvent = (event: GameEvent) => {
    const keys = Object.keys(event);

    if (keys.length <= 2) return;

    if (event.d) {
      const npcId = event.d[2];

      if (npcId && npcId.length > 0) {
        talkingNpcId.current = npcId;
      }
    }

    if (event.f && event.f.w && event.f.init === "1") {
      pendingBattle.current = event.f.w;
    }

    if (
      event.f &&
      event.f.endBattle === 1 &&
      !!event.item &&
      !!event.loot &&
      event.loot.source === "fight"
    ) {
      const loots = getLoot(event.item);

      if (loots.length > 0) {
        const { npcs, party } = getBattleParticipants(
          pendingBattle.current,
          event.f.w,
          newInterface
        );

        const payload = {
          world: newInterface
            ? window.Engine?.worldConfig?.getWorldName()
            : window.g?.worldConfig?.getWorldName(),
          source: event.loot.source.toUpperCase(),
          location: newInterface ? window.Engine.map.d.name : window.map.name,
          npcs,
          loots,
          players: party,
        };

        createLoot(payload);
      }
    }

    if (
      event.item &&
      event.loot &&
      event.loot.source === "dialog" &&
      event.npcs_del
    ) {
      const loots = getLoot(event.item);
      if (loots.length > 0) {
        const npcs = event.npcs_del.reduce((acc: KilledNpc[], npc) => {
          const npcData = newInterface
            ? window.Engine.npcs.getById(npc.id)?.d
            : window.g.npc[npc.id];
          if (!npcData) return acc;

          if (npcData) {
            acc.push({
              icon: npcData.icon,
              id: npcData.id,
              prof: npcData.prof,
              hpp: 0,
              type: npcData.type,
              wt: npcData.wt,
              lvl: npcData.lvl,
              name: npcData.nick,
              location: newInterface
                ? window.Engine.map.d.name
                : window.map.name,
            });
          }

          return acc;
        }, []);

        if (npcs.length > 0) {
          const {
            id,
            nick,
            img,
            prof,
            warrior_stats: { hp, maxhp },
            lvl,
            account,
          } = newInterface ? window.Engine.hero.d : window.hero;

          const players = [
            {
              id,
              name: nick,
              icon: img,
              prof,
              hpp: Math.floor((hp / maxhp) * 100),
              lvl,
              accountId: account,
            },
          ];

          const payload = {
            world: newInterface
              ? window.Engine?.worldConfig?.getWorldName()
              : window.g?.worldConfig?.getWorldName(),
            source: event.loot.source.toUpperCase(),
            location: newInterface ? window.Engine.map.d.name : window.map.name,
            loots,
            npcs,
            players,
          };

          createLoot(payload);
        }
      }
    }

    if (event.item && event.loot && event.loot.source === "dialog") {
      const loots = getLoot(event.item);
      if (loots.length > 0 && talkingNpcId.current) {
        const npcData = newInterface
          ? window.Engine.npcs.getById(+talkingNpcId.current)?.d
          : window.g.npc[+talkingNpcId.current];

        if (npcData) {
          const {
            id,
            nick,
            img,
            prof,
            warrior_stats: { hp, maxhp },
            lvl,
            account,
          } = newInterface ? window.Engine.hero.d : window.hero;

          const players = [
            {
              id,
              name: nick,
              icon: img,
              prof,
              hpp: Math.floor((hp / maxhp) * 100),
              lvl,
              accountId: account,
            },
          ];

          const payload = {
            world: newInterface
              ? window.Engine?.worldConfig?.getWorldName()
              : window.g?.worldConfig?.getWorldName(),
            source: event.loot.source.toUpperCase(),
            location: newInterface ? window.Engine.map.d.name : window.map.name,
            loots,
            npcs: [
              {
                icon: npcData.icon,
                id: npcData.id,
                prof: npcData.prof,
                hpp: 0,
                type: npcData.type,
                wt: npcData.wt,
                lvl: npcData.lvl,
                name: npcData.nick,
                location: newInterface
                  ? window.Engine.map.d.name
                  : window.map.name,
              },
            ],
            players,
          };

          createLoot(payload);
        }
      }
    }

    if (event.npcs_del) {
      event.npcs_del.forEach((npc) => {
        const npcData = newInterface
          ? window.Engine.npcs.getById(npc.id)?.d
          : window.g.npc[npc.id];
        if (!npcData) return;

        const isWithinRange = checkIfNpcIsWithinRange(
          npcData as unknown as HeroD,
          newInterface
        );

        if (!isWithinRange) {
          return;
        }

        if (!npc.respBaseSeconds) {
          return;
        }

        const { resp_rand: respawnRandomness } = npcData;

        const payload = {
          respawnRandomness,
          respBaseSeconds: npc.respBaseSeconds,
          world: newInterface
            ? window.Engine?.worldConfig?.getWorldName()
            : window.g?.worldConfig?.getWorldName(),
          npc: {
            icon: npcData.icon,
            id: npcData.id,
            prof: npcData.prof,
            wt: npcData.wt,
            hpp: 0,
            type: npcData.type,
            lvl: npcData.lvl,
            name: npcData.nick,
            location: newInterface ? window.Engine.map.d.name : window.map.name,
          },
        };

        createTimer(payload);
      });
    }
  };

  useEffect(() => {
    if (!initialized || gameEventsParserInitialized) return;

    setupGameEventsHandler();

    return () => {
      removeGameEventsHandler();
    };
  }, [initialized]);
};

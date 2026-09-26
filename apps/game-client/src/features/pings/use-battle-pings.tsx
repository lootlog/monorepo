import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { readSettingsValue } from "@/features/settings/persistence/settings-snapshot";
import { useBattlePingPreferences } from "@/features/settings/persistence/use-battle-ping-preferences";
import { isWarriorDead } from "@/hooks/game-events/helpers/battle.helpers";
import { playSound } from "@/lib/sound-playback";
import { useBattleStore } from "@/store/game-store/battle.store";
import { useGameStore } from "@/store/game.store";
import { normalizeBattlePings } from "@lootlog/domain/account-preferences";
import {
  isBattleEnemyPingType,
  isBattlePingType,
  type BattlePingEvent,
  type BattlePingType,
} from "@lootlog/schema/battle-ping";
import type { MapPingAck } from "@lootlog/schema/map-ping";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { battlePingStore } from "./battle-ping-store";
import {
  getBattleTeamCharacterIds,
  getBattleWarrior,
  getBattleWarriorId,
  getBattleWarriorRole,
  resolveBattleWarriorElement,
} from "./battle-warriors";
import type {
  PingInteractionStart,
  PingMenu,
} from "./ping-interaction-controller";
import {
  BATTLE_ENEMY_RING_TYPES,
  BATTLE_SELF_RING_TYPES,
  PING_REQUEST_FOR_ME_PLAYBACK_RATE,
  getBattleProfessionRequests,
  getPingPresentation,
} from "./ping-presentation";
import { useRejectedPingHint, type PingPointer } from "./use-map-pings";

const ACK_TIMEOUT_MS = 1_500;

const areBattlePingsEnabled = () =>
  Boolean(useGameStore.getState().game?.hero.accountId) &&
  normalizeBattlePings(readSettingsValue("gameData.battlePings")).enabled;

/** The current fight, or null outside a battle Lootlog can ping in. */
const readBattleContext = () => {
  const game = useGameStore.getState().game;
  const { battleState, battleWarriors } = useBattleStore.getState();

  if (!game || game.interface !== "ni" || battleState !== "in-battle") {
    return null;
  }

  return { game, heroId: game.hero.characterId, warriors: battleWarriors };
};

const playPingSound = (type: BattlePingType, forMe: boolean) => {
  playSound("pings", "mapPing", {
    playbackRate: forMe
      ? PING_REQUEST_FOR_ME_PLAYBACK_RATE
      : getPingPresentation(type).playbackRate,
    preservesPitch: false,
  });
};

export const useBattlePings = () => {
  const { socket, connected, joined } = useSocket();

  const isNewInterface = useGameStore(
    (state) => state.game?.interface === "ni",
  );

  const enabled = useBattlePingPreferences().data?.enabled ?? false;
  const online = enabled && isNewInterface && connected && joined;
  const showHint = useRejectedPingHint();
  const { t } = useTranslation("pings");

  // Pings belong to one fight: drop them when it ends, and drop a warrior's
  // pings once it dies.
  useEffect(() => {
    if (!online) {
      battlePingStore.clear();

      return;
    }

    return useBattleStore.subscribe((state, previous) => {
      if (state.battleState !== "in-battle") {
        battlePingStore.clear();

        return;
      }

      if (state.battleWarriors === previous.battleWarriors) {
        return;
      }

      const { marks, target } = battlePingStore.getSnapshot();
      const pinged = [...marks.keys(), ...(target ? [target.warriorId] : [])];

      for (const warriorId of pinged) {
        const warrior = getBattleWarrior(state.battleWarriors, warriorId);

        if (!warrior || isWarriorDead(warrior)) {
          battlePingStore.removeWarrior(warriorId);
        }
      }
    });
  }, [online]);

  useEffect(() => {
    if (!online || !socket) {
      return;
    }

    const handleBattlePing = (event: BattlePingEvent) => {
      const context = readBattleContext();

      if (
        !context ||
        !areBattlePingsEnabled() ||
        !isBattlePingType(event.type) ||
        event.world !== context.game.world ||
        event.mapId !== context.game.map.id ||
        !getBattleWarrior(context.warriors, event.warriorId) ||
        // Only a character fighting on the hero's team may mark this fight.
        !getBattleTeamCharacterIds(context.warriors, context.heroId).includes(
          event.sender.characterId,
        )
      ) {
        return;
      }

      const forMe =
        String(event.warriorId) === context.heroId &&
        !isBattleEnemyPingType(event.type);

      battlePingStore.apply({
        forMe,
        senderName: event.sender.name,
        type: event.type,
        warriorId: event.warriorId,
      });
      playPingSound(event.type, forMe);
    };

    socket.on(GatewayEvent.BATTLE_PING_RECEIVE, handleBattlePing);

    return () => {
      socket.off(GatewayEvent.BATTLE_PING_RECEIVE, handleBattlePing);
    };
  }, [online, socket]);

  const getMenu = (warriorId: number): PingMenu | null => {
    const context = readBattleContext();

    if (!context) {
      return null;
    }

    const warrior = getBattleWarrior(context.warriors, warriorId);

    const role = getBattleWarriorRole(
      context.warriors,
      context.heroId,
      warriorId,
    );

    if (!warrior || !role || isWarriorDead(warrior)) {
      return null;
    }

    const title = warrior.prof
      ? t("wheel.warriorTitle", {
          name: warrior.name,
          profession: t(`onlinePlayers:professions.${warrior.prof}`, {
            defaultValue: warrior.prof,
          }),
        })
      : warrior.name;

    if (role === "enemy") {
      return {
        centre: null,
        quick: "attack",
        ring: BATTLE_ENEMY_RING_TYPES,
        title,
      };
    }

    const ring =
      role === "self"
        ? BATTLE_SELF_RING_TYPES
        : getBattleProfessionRequests(warrior.prof);

    return ring.length > 0 ? { centre: null, quick: null, ring, title } : null;
  };

  /** Resolves the warrior under a press or the last known pointer. */
  const resolveStart = (
    pointer: PingPointer,
  ): Omit<PingInteractionStart, "identity"> | null => {
    if (
      !isNewInterface ||
      !socket ||
      !connected ||
      !joined ||
      !areBattlePingsEnabled()
    ) {
      return null;
    }

    const element = resolveBattleWarriorElement(pointer.target);
    const warriorId = element ? getBattleWarriorId(element) : null;
    const menu = warriorId === null ? null : getMenu(warriorId);

    if (warriorId === null || !menu) {
      return null;
    }

    return {
      menu,
      origin: { x: pointer.x, y: pointer.y },
      target: { kind: "battle", warriorId },
    };
  };

  const send = (warriorId: number, type: BattlePingType) => {
    const context = readBattleContext();

    if (!context || !socket || !getBattleWarrior(context.warriors, warriorId)) {
      return;
    }

    const senderName = context.game.hero.name;
    const previousTarget = battlePingStore.getSnapshot().target;

    battlePingStore.apply({ forMe: false, senderName, type, warriorId });
    playPingSound(type, false);

    const recipientCharacterIds = getBattleTeamCharacterIds(
      context.warriors,
      context.heroId,
    );

    // A solo fight has nobody to tell; the local mark is the whole effect.
    if (recipientCharacterIds.length === 0) {
      return;
    }

    socket.timeout(ACK_TIMEOUT_MS).emit(
      GatewayEvent.BATTLE_PING_SEND,
      {
        expectedMapId: context.game.map.id,
        recipientCharacterIds,
        type,
        warriorId,
      },
      (error: Error | null, acknowledgement?: MapPingAck) => {
        if (error || acknowledgement?.status !== "rejected") {
          return;
        }

        battlePingStore.retract(
          { senderName, type, warriorId },
          previousTarget,
        );
        showHint(acknowledgement);
      },
    );
  };

  return { active: online, resolveStart, send };
};
